import re
try:
    import pymupdf
except ImportError:
    import fitz as pymupdf
from typing import List, Dict, Any, Optional
from .layout_detector import LayoutDetector

class SpatialBlock:
    def __init__(self, x0: float, y0: float, x1: float, y1: float, text: str, page_num: int):
        self.x0 = x0
        self.y0 = y0
        self.x1 = x1
        self.y1 = y1
        self.text = text
        self.page_num = page_num

    def to_dict(self) -> Dict[str, Any]:
        return {
            "bbox": [self.x0, self.y0, self.x1, self.y1],
            "text": self.text,
            "pageNum": self.page_num,
        }

class TextExtractor:
    """
    Extracts text blocks from PDF pages with correct reading order
    and spatial coordinates, preserving formatting (bold, sub/superscript),
    and stripping artifacts, running headers/footers, and diagram-internal labels.
    """

    def __init__(self, doc: pymupdf.Document, layout: LayoutDetector):
        self.doc = doc
        self.layout = layout

    def extract_page_blocks(self, page_index: int) -> List[SpatialBlock]:
        page = self.doc[page_index]
        rect = page.rect
        width, height = rect.width, rect.height
        mid_x = width / 2.0

        # Collect diagram bounding boxes on this page to filter out isolated labels
        diagram_bboxes = []
        for img in page.get_image_info(xrefs=True):
            b = img.get("bbox")
            if b:
                w, h = b[2] - b[0], b[3] - b[1]
                if w >= 40 and h >= 35:
                    diagram_bboxes.append(pymupdf.Rect(b))

        page_dict = page.get_text("dict")
        raw_blocks = page_dict.get("blocks", [])
        valid_blocks = []

        for b in raw_blocks:
            if b.get("type") != 0: # 0 is text block
                continue

            bbox = b.get("bbox", [0, 0, 0, 0])
            x0, y0, x1, y1 = bbox
            block_rect = pymupdf.Rect(x0, y0, x1, y1)

            # Skip header/footer margin areas (while strictly preserving question blocks at top margin)
            b_sample_text = "".join(s.get("text", "") for l in b.get("lines", []) for s in l.get("spans", [])).strip()
            is_question = bool(re.search(r'\b(?:Q\s*\.?\s*\d+|Question\s*\d+)\b', b_sample_text, re.I))

            if not is_question and (y1 < height * 0.04 or y0 > height * 0.96):
                continue
            if is_question and (y1 < height * 0.02 or y0 > height * 0.98):
                continue

            # Process lines and spans
            lines = b.get("lines", [])
            line_strings = []

            for l in lines:
                spans = l.get("spans", [])
                if not spans:
                    continue

                base_size = max(s.get("size", 10.0) for s in spans)
                l_bbox = l.get("bbox", [x0, y0, x1, y1])
                y_mid_line = (l_bbox[1] + l_bbox[3]) / 2.0

                span_parts = []
                for s in spans:
                    t = s.get("text", "")
                    if not t:
                        continue

                    sz = s.get("size", base_size)
                    flags = s.get("flags", 0)
                    font = s.get("font", "").lower()
                    is_bold = bool(flags & 16 or "bold" in font or "black" in font)

                    # Subscript / Superscript detection
                    if sz < base_size * 0.82 and t.strip():
                        s_bbox = s.get("bbox", l_bbox)
                        y_mid_span = (s_bbox[1] + s_bbox[3]) / 2.0
                        if y_mid_span < y_mid_line - 1.2:
                            t = f"^{{{t.strip()}}}"
                        elif y_mid_span > y_mid_line + 1.2:
                            t = f"_{{{t.strip()}}}"

                    # Bold formatting (preserve for content words, but keep question/section labels standard)
                    stripped = t.strip()
                    if stripped and is_bold:
                        if re.match(r'^(?:Q\s*\.?\s*\d+|Question\s*\d+|SECTION\s*[0-9A-Za-z]+|PART\s*[IVX\d]+|\([A-Da-d1-4]\)|[A-Da-d1-4][\.\)])$', stripped, re.I):
                            t = f"{stripped} "
                        elif not stripped.startswith("**"):
                            t = f"**{stripped}** "

                    span_parts.append(t)

                line_str = "".join(span_parts).strip()
                if line_str:
                    line_strings.append(line_str)

            cleaned_text = " ".join(line_strings).strip()
            if not cleaned_text:
                continue

            # Skip header/footer watermarks
            if self.layout.is_artifact(cleaned_text, y0, y1, height):
                continue

            # Skip stray labels inside diagrams (e.g. "O", "P", "q" inside a circuit/graph)
            if len(cleaned_text) < 18:
                is_inside_diagram = any(diag_rect.contains(block_rect) for diag_rect in diagram_bboxes)
                if is_inside_diagram:
                    continue

            valid_blocks.append((x0, y0, x1, y1, cleaned_text))

        # Sort according to layout column awareness
        if self.layout.is_two_column:
            def two_col_sort_key(item):
                bx0, by0, bx1, by1, _ = item
                col = 0 if (bx0 + bx1) / 2.0 < mid_x else 1
                return (col, round(by0 / 5.0) * 5.0, bx0)
            valid_blocks.sort(key=two_col_sort_key)
        else:
            def single_col_sort_key(item):
                bx0, by0, bx1, by1, _ = item
                return (round(by0 / 5.0) * 5.0, bx0)
            valid_blocks.sort(key=single_col_sort_key)

        return [
            SpatialBlock(x0, y0, x1, y1, text, page_index + 1)
            for x0, y0, x1, y1, text in valid_blocks
        ]

    def extract_all_clean_text(self) -> str:
        """Returns the full clean document text with reading-order preserved."""
        pages_content = []
        for p_idx in range(len(self.doc)):
            blocks = self.extract_page_blocks(p_idx)
            page_text = "\n\n".join(b.text for b in blocks)
            if page_text:
                pages_content.append(f"--- [Page {p_idx + 1}] ---\n{page_text}")
        return "\n\n".join(pages_content)
