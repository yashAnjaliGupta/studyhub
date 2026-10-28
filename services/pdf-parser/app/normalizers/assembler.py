import asyncio
import logging
import uuid
from typing import List, Dict, Any, Optional
from ..schemas import ExamPaper, Exam, Subject, Section, Question, Asset
from .planner import Planner, DocumentBlueprint
from .workers import QuestionWorker

logger = logging.getLogger("pdf_parser.assembler")

class CanonicalAssembler:
    """
    Orchestrates the Planner-Worker pipeline:
    1. Generates Document Blueprint.
    2. Runs Question Workers concurrently across all sections with scoped text chunks.
    3. Merges the results into a strictly validated ExamPaper instance.
    """

    @classmethod
    async def assemble_paper_async(
        cls,
        full_text: str,
        total_pages: int,
        registered_assets: List[Asset],
        answer_keys: Dict[int, str],
        exam_type_hint: Optional[str] = None,
        year_hint: Optional[int] = None,
        paper_title_hint: Optional[str] = None
    ) -> ExamPaper:
        # Step 1: Generate Blueprint via Planner
        blueprint = Planner.generate_plan(
            full_text=full_text,
            total_pages=total_pages,
            exam_type_hint=exam_type_hint,
            year_hint=year_hint,
            paper_title_hint=paper_title_hint
        )

        logger.info(f"[Assembler] Blueprint generated with {len(blueprint.subjects_plan)} subjects. Starting Question Workers...")

        # Step 2: Prepare worker tasks for each section across all subjects
        worker_tasks = []
        section_meta_map = [] # stores (subject_idx, section_idx, sec_plan, subj_plan)

        for s_idx, subj_plan in enumerate(blueprint.subjects_plan):
            subj_name = subj_plan.get("name", "General Subject")
            subj_text = subj_plan.get("text") or full_text

            for sec_idx, sec_plan in enumerate(subj_plan.get("sections", [])):
                start_q = sec_plan.get("startQuestion", 1)
                end_q = sec_plan.get("endQuestion", start_q + 10)

                # CRITICAL: Pass strictly scoped text chunk for this section, NOT full document!
                # This prevents questions in later subjects from being duplicated across every section.
                sec_text = sec_plan.get("text") or subj_text

                sp = sec_plan.get("startPage") or subj_plan.get("startPage")
                ep = sec_plan.get("endPage") or subj_plan.get("endPage")
                if sp and ep:
                    sec_assets = [a for a in registered_assets if a.pageNumber and sp <= a.pageNumber <= ep]
                else:
                    sec_assets = registered_assets

                task = QuestionWorker.parse_section_chunk_async(
                    subject_name=subj_name,
                    section_info=sec_plan,
                    section_text=sec_text,
                    page_assets=sec_assets,
                    answer_keys=answer_keys
                )
                worker_tasks.append(task)
                section_meta_map.append((s_idx, sec_idx, sec_plan, subj_plan))

        # Run all worker chunks concurrently
        worker_results = await asyncio.gather(*worker_tasks, return_exceptions=True)

        # Step 3: Populate Subjects, Sections, and Questions
        all_top_level_questions: List[Question] = []
        all_top_level_sections: List[Section] = []

        global_seq = 1
        for i, (s_idx, sec_idx, sec_plan, subj_plan) in enumerate(section_meta_map):
            raw_res = worker_results[i]
            parsed_questions: List[Question] = raw_res if isinstance(raw_res, list) else []

            subj_name = subj_plan.get("name", "General Subject")
            subj_code = subj_plan.get("code", "GEN")

            for q in parsed_questions:
                orig_q_num = q.number
                q.subject = subj_name
                q.metadata = q.metadata or {}
                q.metadata["subject"] = subj_name
                q.metadata["subjectCode"] = subj_code
                q.metadata["sourceQuestionNumber"] = str(orig_q_num)
                q.sourceQuestionNumber = str(orig_q_num)
                q.id = q.id if (q.id and len(q.id) == 36 and "-" in q.id) else str(uuid.uuid4())
                # Continuous sequence number across whole paper
                q.number = global_seq
                global_seq += 1

            sec_obj = Section(
                number=sec_plan.get("number"),
                title=sec_plan.get("title"),
                code=sec_plan.get("code"),
                instructions=sec_plan.get("instructions", []),
                questionType=sec_plan.get("questionType"),
                maximumMarks=sec_plan.get("maximumMarks"),
                marksPerQuestion=sec_plan.get("marksPerQuestion", 4),
                negativeMarks=sec_plan.get("negativeMarks", 1),
                questions=parsed_questions,
                sourcePages=sec_plan.get("sourcePages", []),
                metadata={}
            )
            all_top_level_sections.append(sec_obj)
            all_top_level_questions.extend(parsed_questions)

        # Build Subject tree
        subjects_list: List[Subject] = []
        subject_breakdown = {}

        for s_idx, subj_plan in enumerate(blueprint.subjects_plan):
            subj_sections = [
                all_top_level_sections[i]
                for i, (si, _, _, _) in enumerate(section_meta_map)
                if si == s_idx
            ]
            subj_questions = [q for sec in subj_sections for q in sec.questions]
            s_name = subj_plan.get("name", "General Subject")
            subject_breakdown[s_name] = len(subj_questions)

            subjects_list.append(Subject(
                name=s_name,
                code=subj_plan.get("code"),
                instructions=subj_plan.get("instructions", []),
                maximumMarks=subj_plan.get("maximumMarks"),
                sections=subj_sections,
                questions=subj_questions,
                metadata={}
            ))

        # Sort top-level questions by continuous sequence number
        all_top_level_questions.sort(key=lambda q: (int(q.number) if str(q.number).isdigit() else 999))

        # Update blueprint exam total questions to match actual extracted count
        blueprint.exam.totalQuestions = len(all_top_level_questions)

        logger.info(
            f"[Assembler] Assembled final ExamPaper: {len(all_top_level_questions)} total questions across {len(subjects_list)} subjects. "
            f"Breakdown: {subject_breakdown}"
        )

        # Build and validate canonical root ExamPaper
        paper = ExamPaper(
            schemaVersion="1.0",
            exam=blueprint.exam,
            subjects=subjects_list,
            sections=all_top_level_sections,
            questions=all_top_level_questions,
            instructions=blueprint.instructions,
            assets=registered_assets,
            metadata={
                "blueprint": blueprint.to_dict()
            }
        )
        return paper

    @classmethod
    def extract_answer_key(cls, full_text: str) -> Dict[int, str]:
        """Extracts answer key mapping if present in final pages."""
        import re
        answer_keys: Dict[int, str] = {}
        key_section = None

        markers = ["ANSWER KEY", "ANSWER KEYS", "Answer Key", "Key:"]
        for marker in markers:
            if marker in full_text:
                parts = full_text.split(marker)
                key_section = parts[-1]
                break

        if key_section:
            matches = re.findall(r'(\d+)[\.\s\:\-\)]+\(?([0-9a-zA-Z\.\-]+)\)?', key_section)
            for q_num_str, ans in matches:
                try:
                    q_num = int(q_num_str)
                    if 1 <= q_num <= 120:
                        answer_keys[q_num] = ans.strip().upper()
                except ValueError:
                    pass

        return answer_keys

