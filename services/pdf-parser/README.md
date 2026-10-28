# 🔬 StudyHub PDF Parsing & Ingestion Microservice (`services/pdf-parser`)

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python)](https://www.python.org/)
[![PyMuPDF](https://img.shields.io/badge/PyMuPDF-1.24%2B-red)](https://pymupdf.readthedocs.io/)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini%20Vision-4285F4?logo=google)](https://ai.google.dev/)

A dedicated, high-performance Python FastAPI microservice engineered specifically for complex STEM exam PDF parsing (JEE Main, JEE Advanced, NEET, CBSE).

---

## ⚡ Core Capabilities

- **Layout-Aware Column Detection**: Distinguishes single-column vs. dual-column exam pages and reconstructs reading order without text interleaving.
- **Watermark & Header/Footer Stripping**: Discovers repetitive coach-institution branding (MathonGo, Allen, Resonance, NTA) across pages and strips them from the question text.
- **Diagram & Circuit Extraction**: Isolates both raster images and vector drawing operations, converts figures to compressed `.webp` format, and maps each diagram to its corresponding question or option.
- **Mathematical Formula Protection**: Preserves LaTeX formatting ($\frac{a}{b}$, $\sqrt{x}$, $\int$, Greek symbols) for native rendering in KaTeX.
- **Strict Pydantic Validation**: Validates the extracted paper against the canonical `ExamPaper` schema before sending or storing.

---

## 📁 Architecture & File Layout

```
services/pdf-parser/
├── app/
│   ├── extractors/
│   │   ├── layout_detector.py   # Multi-column & header/footer boundary detector
│   │   ├── text_extractor.py    # Font-weighted text block extraction
│   │   └── diagram_extractor.py # Vector schematics & raster image cropper
│   ├── normalizers/
│   │   └── assembler.py         # Schema normalizer into canonical ExamPaper JSON
│   ├── main.py                  # FastAPI application routes
│   └── schemas.py               # Pydantic schemas (ExamPaper, Question, Option)
├── requirements.txt
└── README.md
```

---

## 🛠️ Environment Configuration

Create `.env` inside `services/pdf-parser/`:

```env
# AWS Configuration (S3 for diagram uploads & Bedrock for LLM verification)
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="your-s3-bucket-name"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
NEXT_PUBLIC_CDN_URL="https://your-cdn-domain.com/"

# Google Gemini API (High-precision STEM reasoning engine)
GEMINI_API_KEY="your-gemini-api-key"
```

---

## 🚀 Running the Microservice

### 1. Install Python Dependencies
```bash
cd services/pdf-parser
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Start Uvicorn Server
From monorepo root:
```bash
npm run parser:dev
```
Or directly from `services/pdf-parser`:
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

---

## 📡 API Endpoints

- `GET /health`: Microservice health check.
- `POST /api/v1/parse-paper`: Accepts JSON payload `{ "pdfPath": "..." }` or `{ "pdfUrl": "..." }`.
- `POST /api/v1/upload-and-parse`: Accepts `multipart/form-data` PDF file upload.

Interactive OpenAPI docs are available at [http://localhost:8001/docs](http://localhost:8001/docs).
