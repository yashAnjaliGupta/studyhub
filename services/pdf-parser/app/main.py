import time
import os
import io
import re
import json
import shutil
import logging
import tempfile
from pathlib import Path
from typing import Optional
import pymupdf
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Configure clean, structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("pdf_parser.main")

# Load environment variables (AWS Bedrock credentials, CDN URLs)
_repo_root = Path(__file__).resolve().parents[3]
_service_env = Path(__file__).resolve().parent.parent / ".env"
_testhub_env = _repo_root / "apps" / "testhub" / ".env"
_root_env = _repo_root / ".env"

if _service_env.exists():
    load_dotenv(dotenv_path=_service_env)
if _testhub_env.exists():
    load_dotenv(dotenv_path=_testhub_env)
if _root_env.exists():
    load_dotenv(dotenv_path=_root_env)

active_providers = []
if os.environ.get("AWS_ACCESS_KEY_ID"):
    active_providers.append(f"AWS Bedrock ({os.environ.get('AWS_REGION', 'us-east-1')})")
if os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"):
    active_providers.append("Google Gemini API")

if active_providers:
    logger.info(f"[PDF PARSER] High-fidelity LLM engines active: {', '.join(active_providers)}")
else:
    logger.warning("[PDF PARSER] No LLM credentials found (AWS_ACCESS_KEY_ID or GEMINI_API_KEY).")


from .schemas import (
    ParseRequest,
    ParseResponse,
    ExamPaper
)
from .extractors.layout_detector import LayoutDetector
from .extractors.text_extractor import TextExtractor
from .extractors.diagram_extractor import DiagramExtractor
from .normalizers.assembler import CanonicalAssembler

app = FastAPI(
    title="StudyHub PDF Parsing & Ingestion Microservice",
    version="1.0.0",
    description="High-performance, layout-aware STEM document parser and schema normalizer for TestHub."
)

# Enable CORS for Next.js apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "pdf-parser",
        "version": "1.0.0"
    }

async def process_pdf_document(
    doc: pymupdf.Document,
    paper_title: str,
    paper_id: str,
    exam_type: str = "JEE_MAIN",
    year: int = 2024,
    output_diagrams_dir: Optional[str] = None
) -> ParseResponse:
    start_time = time.time()
    errors = []

    logger.info(f"\n{'='*70}\n[PDF PARSER] INGESTION STARTED: '{paper_title}' (ID: {paper_id})\n  Exam: {exam_type} | Year: {year} | Total Pages: {len(doc)}\n{'='*70}")

    try:
        # Stage 1: Layout & Watermark Analysis
        t0 = time.time()
        layout = LayoutDetector(doc)
        layout_summary = layout.get_summary()
        logger.info(f"[Stage 1] Layout & Watermark Analysis complete in {round((time.time() - t0)*1000, 1)}ms: {layout_summary.get('columns')} layout, {len(layout_summary.get('watermarks', []))} watermarks detected")

        # Stage 2: Reading-order Text Extraction
        t0 = time.time()
        text_extractor = TextExtractor(doc, layout)
        full_text = text_extractor.extract_all_clean_text()
        logger.info(f"[Stage 2] Reading-order Text Extraction complete in {round((time.time() - t0)*1000, 1)}ms ({len(full_text)} characters, {len(full_text.split())} words)")

        # Stage 3: Diagram & Asset Extraction (Canonical Registry)
        t0 = time.time()
        diagram_extractor = DiagramExtractor(doc, paper_id, output_diagrams_dir)
        all_diagrams = []
        for i in range(len(doc)):
            all_diagrams.extend(diagram_extractor.extract_page_diagrams(i))

        registered_assets = diagram_extractor.register_all_diagrams(all_diagrams)
        answer_keys = CanonicalAssembler.extract_answer_key(full_text)
        logger.info(f"[Stage 3] Diagram Extraction complete in {round((time.time() - t0)*1000, 1)}ms: {len(registered_assets)} assets registered, {len(answer_keys)} answer keys extracted")

        # Stage 4: Planner-Worker Pipeline Assembly
        t0 = time.time()
        canonical_paper = await CanonicalAssembler.assemble_paper_async(
            full_text=full_text,
            total_pages=len(doc),
            registered_assets=registered_assets,
            answer_keys=answer_keys,
            exam_type_hint=exam_type,
            year_hint=year,
            paper_title_hint=paper_title
        )
        logger.info(f"[Stage 4] Planner-Worker Pipeline Assembly complete in {round((time.time() - t0)*1000, 1)}ms")

        # Retrieve and log Document Blueprint
        blueprint_dict = canonical_paper.metadata.get("blueprint")
        if blueprint_dict:
            logger.info(f"\n[PLANNER BLUEPRINT RESULT]\n{json.dumps(blueprint_dict, indent=2)}")

        duration_ms = round((time.time() - start_time) * 1000, 2)

        # Print Final Summary
        logger.info(f"\n{'='*70}\n[FINAL PAPER SUMMARY] Parsed '{paper_title}' in {duration_ms}ms:")
        logger.info(f"  • Total Questions: {len(canonical_paper.questions)}")
        for subj in canonical_paper.subjects:
            sec_details = [f"{sec.title}: {len(sec.questions)} Qs" for sec in subj.sections]
            logger.info(f"    - {subj.name} ({len(subj.questions)} Qs): {', '.join(sec_details)}")
        logger.info(f"{'='*70}\n")

        return ParseResponse(
            success=True,
            paper=canonical_paper,
            errors=errors,
            processingTimeMs=duration_ms,
            detectedLayout=layout_summary,
            plannerBlueprint=blueprint_dict,
            generatedPdfPath=None,
            debugJsonPath=None
        )

    except Exception as e:
        logger.error(f"[PDF PARSER ERROR] Failed to process document: {e}", exc_info=True)
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return ParseResponse(
            success=False,
            paper=None,
            errors=[str(e)],
            processingTimeMs=duration_ms,
            detectedLayout=None
        )

def extract_exam_type_from_path(url_or_path: str, default: str = "Exam") -> str:
    """
    Dynamically extracts the exam/test category from the URL or directory structure,
    without hardcoding specific exam names.
    Examples:
      http://localhost:3000/JEE/common/JEE_Advanced/2025_1_English.pdf -> "JEE_Advanced"
      http://localhost:3000/UPSC/CSE_Prelims/2024.pdf -> "CSE_Prelims"
      http://localhost:3000/GATE/CS/2023.pdf -> "CS"
      http://localhost:3000/NEET/2024/Code_A.pdf -> "NEET"
    """
    if not url_or_path:
        return default
    clean_path = url_or_path.split("?")[0].split("#")[0].replace("\\", "/")
    parts = [p.strip() for p in clean_path.split("/") if p.strip()]

    # Drop protocol, hostname, or port if URL
    dir_parts = [p for p in parts if not (p.endswith(":") or ":" in p)]

    # Exclude filename (last part with extension)
    if dir_parts and "." in dir_parts[-1]:
        dir_parts = dir_parts[:-1]

    generic_words = {"common", "papers", "paper", "files", "file", "uploads", "upload", "static", "media", "data", "input", "output", "pdf", "pdfs", "documents", "admin"}
    meaningful = [p for p in dir_parts if p.lower() not in generic_words and not p.isdigit()]

    if not meaningful:
        return default

    return meaningful[-1]

def extract_year_from_string(s: str, default: int = 2025) -> int:
    m = re.search(r'\b(20[0-3]\d|19[89]\d)\b', s)
    return int(m.group(1)) if m else default

@app.post("/api/v1/parse-paper", response_model=ParseResponse)
async def parse_paper_endpoint(
    req: ParseRequest
):
    if not req.pdfPath and not req.pdfUrl:
        raise HTTPException(status_code=400, detail="Must provide either pdfPath or pdfUrl")

    local_path = req.pdfPath

    # Handle remote download if URL provided
    temp_dir = None
    if req.pdfUrl and not local_path:
        import httpx
        temp_dir = tempfile.mkdtemp()
        local_path = os.path.join(temp_dir, "input.pdf")
        async with httpx.AsyncClient(follow_redirects=True) as client:
            res = await client.get(req.pdfUrl)
            if res.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Failed to download PDF from {req.pdfUrl}")
            with open(local_path, "wb") as f:
                f.write(res.content)

    if not os.path.exists(local_path):
        raise HTTPException(status_code=404, detail=f"PDF file not found at: {local_path}")

    url_name = os.path.splitext(os.path.basename(req.pdfUrl.split("?")[0]))[0] if req.pdfUrl else ""
    local_name = os.path.splitext(os.path.basename(local_path))[0]
    file_stem = url_name or local_name
    if file_stem.lower() in ("input", "paper"):
        file_stem = req.paperId or "Exam Paper"

    context_path = req.pdfUrl or local_path or ""

    # Dynamically determine examType: use explicit request param if provided, else extract from path
    if req.examType and req.examType.strip():
        exam_type_str = req.examType.strip()
    else:
        exam_type_str = extract_exam_type_from_path(context_path, default="Exam")

    # Paper title: name = filename without extension (e.g. 2025_1_English)
    paper_title = req.paperTitle or req.examName or file_stem

    # Paper ID: prefer explicit paperId, else file_stem
    paper_id = req.paperId or file_stem

    # Year: prefer explicit year, else extract 4-digit year from path/filename
    year = req.year or extract_year_from_string(f"{context_path} {file_stem}", default=2025)

    # Determine public directory destination if in StudyHub repo
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
    testhub_diagrams = os.path.join(repo_root, "apps", "testhub", "public", "diagrams")
    if not os.path.exists(testhub_diagrams):
        testhub_diagrams = None

    try:
        doc = pymupdf.open(local_path)
        resp = await process_pdf_document(
            doc=doc,
            paper_title=paper_title,
            paper_id=paper_id,
            exam_type=exam_type_str,
            year=year,
            output_diagrams_dir=testhub_diagrams
        )
        return resp
    finally:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)

@app.post("/api/v1/upload-and-parse", response_model=ParseResponse)
async def upload_and_parse_endpoint(
    file: UploadFile = File(...),
    examType: Optional[str] = Form(None),
    examName: Optional[str] = Form(None),
    year: Optional[int] = Form(None),
    paperId: Optional[str] = Form(None)
):
    # Derive clean file stem from the uploaded filename
    raw_filename = file.filename or "paper"
    file_stem = os.path.splitext(raw_filename)[0]

    final_exam_type = examType.strip() if (examType and examType.strip()) else extract_exam_type_from_path(raw_filename, default="Exam")
    paper_title = examName or file_stem
    paper_id = paperId or file_stem
    final_year = year or extract_year_from_string(f"{raw_filename} {file_stem}", default=2025)

    contents = await file.read()
    doc = pymupdf.open(stream=contents, filetype="pdf")

    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
    testhub_diagrams = os.path.join(repo_root, "apps", "testhub", "public", "diagrams")
    if not os.path.exists(testhub_diagrams):
        testhub_diagrams = None

    return await process_pdf_document(
        doc=doc,
        paper_title=paper_title,
        paper_id=paper_id,
        exam_type=final_exam_type,
        year=final_year,
        output_diagrams_dir=testhub_diagrams
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
