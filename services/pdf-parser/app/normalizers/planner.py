import re
import json
import os
import logging
from typing import Dict, Any, List, Optional
from ..schemas import Exam, Subject, Section, QuestionType

logger = logging.getLogger("pdf_parser.planner")

class DocumentBlueprint:
    def __init__(
        self,
        exam: Exam,
        instructions: List[str],
        subjects_plan: List[Dict[str, Any]]
    ):
        self.exam = exam
        self.instructions = instructions
        self.subjects_plan = subjects_plan # contains subjects with nested section chunks & question ranges

    def to_dict(self) -> Dict[str, Any]:
        return {
            "exam": self.exam.model_dump() if hasattr(self.exam, "model_dump") else (self.exam.dict() if hasattr(self.exam, "dict") else self.exam),
            "instructions": self.instructions,
            "subjects": [
                {
                    "name": s.get("name"),
                    "code": s.get("code"),
                    "maximumMarks": s.get("maximumMarks"),
                    "instructions": s.get("instructions", []),
                    "sections": [
                        {
                            "number": sec.get("number"),
                            "title": sec.get("title"),
                            "questionType": sec.get("questionType"),
                            "marksPerQuestion": sec.get("marksPerQuestion"),
                            "negativeMarks": sec.get("negativeMarks"),
                            "startQuestion": sec.get("startQuestion"),
                            "endQuestion": sec.get("endQuestion"),
                            "instructions": sec.get("instructions", [])
                        }
                        for sec in s.get("sections", [])
                    ]
                }
                for s in self.subjects_plan
            ]
        }

    def summary(self) -> str:
        lines = [
            f"Exam Blueprint: {self.exam.name} ({self.exam.year})",
            f"  Type: {self.exam.examType} | Planned Total Qs: {self.exam.totalQuestions} | Max Marks: {self.exam.maximumMarks}",
            f"  Detected Subjects: {len(self.subjects_plan)}"
        ]
        for s in self.subjects_plan:
            sec_strs = []
            for sec in s.get("sections", []):
                sec_strs.append(f"{sec.get('title')} [Q{sec.get('startQuestion')}..Q{sec.get('endQuestion')} {sec.get('questionType')}]")
            lines.append(f"   • {s.get('name')} ({len(s.get('sections', []))} sections): " + ", ".join(sec_strs))
        return "\n".join(lines)

class Planner:
    """
    Analyzes full exam PDF text to build the Document Blueprint & Chunking Plan
    without extracting individual questions (output size ~400-600 tokens).
    """

    @classmethod
    def generate_plan(
        cls,
        full_text: str,
        total_pages: int,
        exam_type_hint: Optional[str] = None,
        year_hint: Optional[int] = None,
        paper_title_hint: Optional[str] = None
    ) -> DocumentBlueprint:
        if not year_hint:
            m = re.search(r'\b(20[0-3]\d|19[89]\d)\b', f"{paper_title_hint or ''} {full_text[:3000]}")
            year_hint = int(m.group(1)) if m else 2025

        if not exam_type_hint:
            exam_type_hint = "Exam"

        logger.info(f"[Planner] Generating Document Blueprint for '{paper_title_hint}' (Type: {exam_type_hint}, Year: {year_hint}, Pages: {total_pages})")

        # 1. Try LLM Blueprint generation if AWS Bedrock / OpenAI credentials exist
        llm_plan = cls._try_llm_plan(full_text, exam_type_hint, year_hint, paper_title_hint)
        if llm_plan:
            logger.info(f"[Planner] Generated blueprint via LLM:\n{llm_plan.summary()}")
            return llm_plan

        # 2. Heuristic FSM Planner fallback
        plan = cls._heuristic_plan(full_text, total_pages, exam_type_hint, year_hint, paper_title_hint)
        logger.info(f"[Planner] Generated blueprint via Heuristic FSM:\n{plan.summary()}")
        return plan

    @classmethod
    def _try_llm_plan(
        cls,
        full_text: str,
        exam_type_hint: Optional[str],
        year_hint: Optional[int],
        paper_title_hint: Optional[str]
    ) -> Optional[DocumentBlueprint]:
        has_aws = bool(os.environ.get("AWS_ACCESS_KEY_ID") and os.environ.get("AWS_SECRET_ACCESS_KEY"))
        has_gemini = bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))
        if not (has_aws or has_gemini):
            logger.warning("[Planner] Neither AWS Bedrock nor Gemini credentials found in environment.")
            return None

        logger.info("[Planner] Invoking multi-model LLM Client for Document Blueprint...")
        try:
            target_name = paper_title_hint or "Exam Paper"
            target_exam_type = exam_type_hint or "Exam"
            target_year = year_hint or 2025

            prompt = f"""You are an expert exam structure parser. Analyze this exam paper text and extract the complete document blueprint (all subjects, all sections, instructions, and question ranges).
Do NOT extract individual questions or options. Keep output concise.

CRITICAL RULES:
1. EXAM METADATA (MANDATORY):
   - The exam name MUST BE EXACTLY: "{target_name}". Do NOT invent, expand, translate, or replace it with other titles.
   - The examType MUST BE EXACTLY: "{target_exam_type}".
   - The year MUST BE: {target_year}.

2. SUBJECT IDENTIFICATION:
   - Identify all authentic academic subjects present in this document (e.g. Mathematics, Physics, Chemistry, Biology, General Studies, Computer Science, etc. as appropriate for this paper).
   - The words 'English' or 'Hindi' in the paper title/filename refer to the LANGUAGE/MEDIUM of the paper, NOT an academic subject. NEVER classify a subject as 'English' or 'Hindi' unless it is explicitly an English literature/language exam.
   - You MUST include ALL subjects found across the entire paper!

3. SECTIONS & PAGE RANGES:
   - Identify every section in each subject (e.g. Section 1, Section 2, Section 3, Section 4).
   - In each section, identify 'startQuestion', 'endQuestion', 'questionType' (SINGLE_CHOICE, MULTIPLE_CHOICE, NUMERICAL, MATRIX_MATCH, SUBJECTIVE, or MIXED), 'marksPerQuestion', 'negativeMarks'.
   - Identify 'startPage' and 'endPage' (1-indexed based on the '--- [Page X] ---' markers in the text).

4. PAGE INDEPENDENCE & RUNNING ARTIFACTS (CRITICAL):
   - NEVER treat a page boundary, page transition, or page break as the start or end of ANY entity (subject, section, passage, or question). Entities naturally span across multiple pages without interruption.
   - RUNNING HEADERS & FOOTERS: Text at the top or bottom of pages (e.g., repeated exam titles, coaching institute watermarks, subject names repeated across pages, page counters like "3 / 19" or "Page 4") are purely typographical page artifacts. They MUST NOT be interpreted as new subjects, section boundaries, or question delimiters.
   - QUESTIONS FLOW UNBROKEN ACROSS PAGES: A section NEVER ends merely because a page ends. For example, if Q15 is at the bottom of Page 3, Q16 at the top of Page 4 belongs to the EXACT same section unless an authentic question-type transition (e.g., from Single Choice to Numerical) or authentic subject change is declared in the text.
   - ZERO QUESTION GAPS: Question numbering across consecutive sections MUST BE 100% CONTINUOUS without missing numbers. Never output gaps like Q1..Q15 followed by Q21..Q25; all intervening questions (e.g. Q16..Q20) must be included in the appropriate section.

Return a valid JSON object matching this schema:
{{
  "exam": {{
    "name": "{target_name}",
    "examType": "{target_exam_type}",
    "year": {target_year},
    "durationMinutes": 180,
    "maximumMarks": 180,
    "totalQuestions": 48
  }},
  "instructions": [
    "General exam instructions..."
  ],
  "subjects": [
    {{
      "name": "Mathematics",
      "code": "MAT",
      "maximumMarks": 60,
      "instructions": [],
      "sections": [
        {{
          "number": 1,
          "title": "SECTION 1",
          "maximumMarks": 12,
          "questionType": "SINGLE_CHOICE",
          "marksPerQuestion": 3,
          "negativeMarks": 1,
          "instructions": [
            "This section contains FOUR (04) questions."
          ],
          "startQuestion": 1,
          "endQuestion": 4,
          "startPage": 1,
          "endPage": 2
        }}
      ]
    }}
  ]
}}

Document Text:
---
{full_text[:140000]}
---
Return ONLY valid JSON."""

            from .llm_client import LLMClient
            data = LLMClient.invoke_json_with_retry(
                prompt=prompt,
                system_prompt="You are an expert exam structure parser. Extract complete document blueprints with subjects, sections, instructions, and question ranges.",
                max_tokens=4096,
                temperature=0.1
            )
            exam_data = data.get("exam", {}) or {}
            # Enforce exact authoritative paper metadata
            exam_data["name"] = target_name
            exam_data["examType"] = target_exam_type
            exam_data["year"] = target_year

            exam_obj = Exam(**exam_data)
            subjects_data = data.get("subjects", [])

            # Automatic Gap-Repair: Ensure complete question continuity across sections
            for subj in subjects_data:
                sections = subj.get("sections", [])
                for idx in range(len(sections) - 1):
                    cur_end = sections[idx].get("endQuestion")
                    next_start = sections[idx + 1].get("startQuestion")
                    if cur_end and next_start and next_start > cur_end + 1:
                        logger.warning(
                            f"[Planner] Gap detected in subject '{subj.get('name')}': Q{cur_end} to Q{next_start}. "
                            f"Auto-repairing Section {sections[idx].get('number')} endQuestion: {cur_end} -> {next_start - 1}"
                        )
                        sections[idx]["endQuestion"] = next_start - 1
                        next_sp = sections[idx + 1].get("startPage")
                        if next_sp and sections[idx].get("endPage") and sections[idx]["endPage"] < next_sp:
                            sections[idx]["endPage"] = next_sp

            # Slice page text for each section so workers get strictly scoped chunks
            pages_dict = {}
            parts = re.split(r'(?:^|\n)---\s*\[Page\s+(\d+)\]\s*---\n?', full_text)
            for p_i in range(1, len(parts), 2):
                try:
                    pages_dict[int(parts[p_i])] = parts[p_i + 1]
                except (ValueError, IndexError):
                    pass

            for subj in subjects_data:
                subj_pages = []
                for sec in subj.get("sections", []):
                    sp = sec.get("startPage")
                    ep = sec.get("endPage")
                    if sp and ep and pages_dict:
                        sec_text = "\n\n".join(f"--- [Page {p}] ---\n" + pages_dict.get(p, "") for p in range(sp, ep + 1) if p in pages_dict)
                        sec["text"] = sec_text
                        subj_pages.extend(range(sp, ep + 1))
                    elif pages_dict:
                        sec["text"] = full_text
                if subj_pages and pages_dict:
                    min_p, max_p = min(subj_pages), max(subj_pages)
                    subj["text"] = "\n\n".join(f"--- [Page {p}] ---\n" + pages_dict.get(p, "") for p in range(min_p, max_p + 1) if p in pages_dict)
                else:
                    subj["text"] = full_text

            return DocumentBlueprint(
                exam=exam_obj,
                instructions=data.get("instructions", []),
                subjects_plan=subjects_data
            )
        except Exception as e:
            logger.warning(f"[Planner] LLM Blueprint fallback note: {e}")

        return None

    @classmethod
    def _heuristic_plan(
        cls,
        full_text: str,
        total_pages: int,
        exam_type_hint: Optional[str],
        year_hint: Optional[int],
        paper_title_hint: Optional[str]
    ) -> DocumentBlueprint:
        """Robust FSM that detects subjects, sections, instructions, and question ranges without inaccurate guessing."""
        subjects_plan: List[Dict[str, Any]] = []

        # Find explicit subject boundaries in the text (e.g. Mathematics, PART I: PHYSICS, PART 1 - CHEMISTRY, etc.)
        subj_names = ["Physics", "Chemistry", "Mathematics", "Maths", "Biology", "Botany", "Zoology", "Science"]
        subj_alt = "|".join(subj_names)
        sub_pat = re.compile(
            rf'(?:^|\n)\s*(?:(?:PART|SECTION|PAPER|TEST)\s*(?:[IVX\d]+|[1-4]|[A-D])\s*[:\-–]?\s*)?({subj_alt})\b[^\n]*',
            re.IGNORECASE
        )

        all_matches = list(sub_pat.finditer(full_text))

        # Filter duplicates / running headers: only take match when subject changes
        filtered_subjects = []
        for m in all_matches:
            raw_name = m.group(1).title()
            canon_name = "Mathematics" if raw_name in ("Maths", "Mathematics") else raw_name
            # If empty or switching to a new subject
            if not filtered_subjects or filtered_subjects[-1][0] != canon_name:
                filtered_subjects.append((canon_name, m.start(), m.end()))

        total_questions_planned = 0

        # If explicit subject headers were found in the document
        if filtered_subjects:
            for s_idx, (s_name, start_idx, header_end) in enumerate(filtered_subjects):
                end_idx = filtered_subjects[s_idx + 1][1] if s_idx + 1 < len(filtered_subjects) else len(full_text)
                subj_text = full_text[header_end:end_idx]

                # Determine subject starting page from full_text
                subj_preceding = full_text[:header_end]
                subj_p_matches = list(re.finditer(r'---\s*\[Page\s+(\d+)\]\s*---', subj_preceding))
                subj_start_page = int(subj_p_matches[-1].group(1)) if subj_p_matches else 1

                # Scan sections inside this subject
                sections = cls._scan_sections_in_text(subj_text, default_start_page=subj_start_page)

                subj_q_count = sum(
                    len(range(sec.get("startQuestion", 1), sec.get("endQuestion", 1) + 1))
                    for sec in sections
                )
                total_questions_planned += subj_q_count

                # Safe marks summation: guarantee numeric result
                subj_marks = sum((sec.get("maximumMarks") or 0) for sec in sections)
                if not subj_marks:
                    subj_marks = subj_q_count * 4

                subjects_plan.append({
                    "name": s_name,
                    "code": s_name[:3].upper(),
                    "instructions": [],
                    "maximumMarks": subj_marks,
                    "sections": sections,
                    "text": subj_text
                })
        else:
            # When explicit subject headers do not exist, preserve the authentic exam/paper name
            # without inaccurate structural division or keyword guessing.
            all_q_numbers = [int(m.group(1)) for m in re.finditer(r'(?:^|\n)(?:Q\s*\.?\s*|Question\s*)(\d+)[\.\s\:\)]', full_text)]
            max_q = max(all_q_numbers) if all_q_numbers else 0

            sections = cls._scan_sections_in_text(full_text)
            subj_q_count = sum(
                len(range(sec.get("startQuestion", 1), sec.get("endQuestion", 1) + 1))
                for sec in sections
            ) or max_q or 30
            total_questions_planned = subj_q_count
            subj_marks = sum((sec.get("maximumMarks") or 0) for sec in sections) or (subj_q_count * 4)

            canonical_subj = exam_type_hint or (paper_title_hint.replace("-", " ").replace("_", " ").title() if paper_title_hint else "General Exam")

            subjects_plan.append({
                "name": canonical_subj,
                "code": canonical_subj[:3].upper(),
                "instructions": [],
                "maximumMarks": subj_marks,
                "sections": sections,
                "text": full_text
            })

        exam_obj = Exam(
            name=paper_title_hint or "Exam Paper",
            examType=exam_type_hint or "Exam",
            year=year_hint or 2025,
            durationMinutes=180,
            maximumMarks=sum((s.get("maximumMarks") or 0) for s in subjects_plan) or (total_questions_planned * 4),
            totalQuestions=total_questions_planned,
            sourcePages=list(range(1, total_pages + 1)),
            metadata={}
        )

        return DocumentBlueprint(
            exam=exam_obj,
            instructions=["Please read all section guidelines carefully."],
            subjects_plan=subjects_plan
        )

    @classmethod
    def _scan_sections_in_text(cls, text: str, default_start_page: int = 1) -> List[Dict[str, Any]]:
        sections = []
        sec_matches = list(re.finditer(
            r'(?:^|\n)\s*\b(?:SECTION|Section)\s*([0-9A-Za-z]+)(?:.*?Maximum Marks:\s*(\d+))?',
            text
        ))

        if not sec_matches:
            # Fallback to single section
            q_nums = [int(m.group(1)) for m in re.finditer(r'(?:^|\n)(?:Q\s*\.?\s*|Question\s*)(\d+)[\.\s\:\)]', text)]
            start_q = min(q_nums) if q_nums else 1
            end_q = max(q_nums) if q_nums else 30
            sec_count = len(range(start_q, end_q + 1))
            return [{
                "number": 1,
                "title": "SECTION 1",
                "maximumMarks": sec_count * 4,
                "questionType": "SINGLE_CHOICE",
                "marksPerQuestion": 4,
                "negativeMarks": 1,
                "instructions": [],
                "startQuestion": start_q,
                "endQuestion": end_q,
                "text": text
            }]

        for i, sm in enumerate(sec_matches):
            sec_num = sm.group(1)
            max_marks = int(sm.group(2)) if sm.group(2) else None
            start_pos = sm.end()
            end_pos = sec_matches[i + 1].start() if i + 1 < len(sec_matches) else len(text)
            sec_chunk = text[start_pos:end_pos]

            # Collect instructions before the first question in this section
            q_first = re.search(r'(?:^|\n|\s{2,}|\b)(?:\*{1,2})?(?:Q\s*\.?\s*|Question\s*)(\d+)[\.\s\:\)]*(?:\*{1,2})?', sec_chunk, re.I)
            instruction_text = sec_chunk[:q_first.start()] if q_first else sec_chunk[:500]
            instructions = [
                line.strip() for line in instruction_text.splitlines()
                if line.strip() and not line.strip().startswith("---") and len(line.strip()) > 10
            ]

            # Infer question type
            q_type = "SINGLE_CHOICE"
            inst_combined = " ".join(instructions).lower()
            if "one or more" in inst_combined:
                q_type = "MULTIPLE_CHOICE"
            elif "numerical" in inst_combined or "integer" in inst_combined or "non-negative integer" in inst_combined:
                q_type = "NUMERICAL"
            elif "matching" in inst_combined or "matrix" in inst_combined or "list-i" in inst_combined:
                q_type = "MATRIX_MATCH"

            # Marking scheme inference
            marks_match = re.search(r'Full Marks:\s*\+?(\d+)', inst_combined)
            neg_match = re.search(r'Negative Marks:\s*[-−]?(\d+)', inst_combined)
            marks_per_q = int(marks_match.group(1)) if marks_match else 4
            neg_marks = int(neg_match.group(1)) if neg_match else (2 if q_type == "MULTIPLE_CHOICE" else 1)

            # Question range within this section chunk
            q_nums = [int(m.group(1)) for m in re.finditer(r'(?:^|\n|\s{2,}|\b)(?:\*{1,2})?(?:Q\s*\.?\s*|Question\s*)(\d+)[\.\s\:\)]*(?:\*{1,2})?', sec_chunk, re.I)]
            start_q = min(q_nums) if q_nums else (i * 10 + 1)
            end_q = max(q_nums) if q_nums else (start_q + len(q_nums))

            sec_q_count = max(len(range(start_q, end_q + 1)), len(q_nums), 1)
            sec_computed_marks = max_marks if max_marks is not None else (sec_q_count * marks_per_q)

            # Calculate section start page from preceding page tags
            sec_preceding = text[:start_pos]
            sec_p_matches = list(re.finditer(r'---\s*\[Page\s+(\d+)\]\s*---', sec_preceding))
            sec_start_page = int(sec_p_matches[-1].group(1)) if sec_p_matches else default_start_page

            sections.append({
                "number": int(sec_num) if sec_num.isdigit() else sec_num,
                "title": f"SECTION {sec_num}",
                "maximumMarks": sec_computed_marks,
                "questionType": q_type,
                "marksPerQuestion": marks_per_q,
                "negativeMarks": neg_marks,
                "instructions": instructions,
                "startQuestion": start_q,
                "endQuestion": end_q,
                "startPage": sec_start_page,
                "text": sec_chunk
            })

        return sections
