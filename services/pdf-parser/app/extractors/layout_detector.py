import re
try:
    import pymupdf
except ImportError:
    import fitz as pymupdf
from typing import Dict, List, Any, Set, Tuple
from collections import Counter

class LayoutDetector:
    """
    Analyzes PDF pages to detect reading order, columns, margins,
    and identifies recurring header/footer watermarks across pages.
    """

    def __init__(self, doc: pymupdf.Document):
        self.doc = doc
        self.num_pages = len(doc)
        self.recurring_header_texts: Set[str] = set()
        self.recurring_footer_texts: Set[str] = set()
        self.page_dimensions: List[Tuple[float, float]] = []
        self.is_two_column = False
        self._analyze_document_profile()

    def _analyze_document_profile(self):
        header_candidates = []
        footer_candidates = []
        column_splits = []

        for page in self.doc:
            rect = page.rect
            width, height = rect.width, rect.height
            self.page_dimensions.append((width, height))

            blocks = page.get_text("blocks")
            left_col_count = 0
            right_col_count = 0

            for b in blocks:
                x0, y0, x1, y1, text, block_no, block_type = b
                clean_text = " ".join(text.split()).strip()
                if not clean_text:
                    continue

                # Header zone: top 12% of page
                if y0 < height * 0.12:
                    header_candidates.append(clean_text)

                # Footer zone: bottom 12% of page
                if y1 > height * 0.88:
                    footer_candidates.append(clean_text)

                # Column detection (for non-header/footer content)
                if height * 0.12 <= y0 <= height * 0.88:
                    mid_x = width / 2.0
                    block_mid = (x0 + x1) / 2.0
                    if block_mid < mid_x - 20:
                        left_col_count += 1
                    elif block_mid > mid_x + 20:
                        right_col_count += 1

            if left_col_count >= 3 and right_col_count >= 3:
                column_splits.append(True)
            else:
                column_splits.append(False)

        # Flag headers/footers occurring on more than 35% of pages
        threshold = max(2, int(self.num_pages * 0.35))
        for text, count in Counter(header_candidates).items():
            if count >= threshold and len(text) > 3:
                self.recurring_header_texts.add(text.lower())

        for text, count in Counter(footer_candidates).items():
            if count >= threshold and len(text) > 3:
                self.recurring_footer_texts.add(text.lower())

        # If >= 40% of non-cover pages are dual-column, mark paper as dual-column
        self.is_two_column = sum(column_splits) >= max(1, int(self.num_pages * 0.4))

    def is_artifact(self, text: str, y0: float, y1: float, page_height: float) -> bool:
        """Determines if a block of text is a recurring watermark, header, or footer."""
        t_clean = " ".join(text.split()).strip().lower()
        if not t_clean:
            return True

        # Page numbering patterns e.g. "1 / 16", "Page 2 of 24", "1-16"
        if re.match(r'^\s*\d+\s*(?:/|-|of)\s*\d+\s*$', t_clean, re.I):
            return True
        if re.match(r'^\s*page\s*\d+\s*(?:/|-|of)?\s*\d*\s*$', t_clean, re.I):
            return True

        # Common promotional markers
        common_ad_phrases = [
            "mathongo", "quizrr", "downloaded from", "page ", "test series",
            "previous year paper", "all rights reserved", "allen career institute",
            "resonance", "fiitjee", "nta.ac.in", "join the most relevant"
        ]
        if any(phrase in t_clean for phrase in common_ad_phrases) and len(t_clean) < 80:
            return True

        if y0 < page_height * 0.12:
            return any(h in t_clean or t_clean in h for h in self.recurring_header_texts)
        if y1 > page_height * 0.88:
            return any(f in t_clean or t_clean in f for f in self.recurring_footer_texts)

        return False

    def get_summary(self) -> Dict[str, Any]:
        return {
            "numPages": self.num_pages,
            "isTwoColumn": self.is_two_column,
            "recurringHeaders": list(self.recurring_header_texts),
            "recurringFooters": list(self.recurring_footer_texts),
        }
