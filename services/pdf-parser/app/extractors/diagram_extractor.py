import os
import io
import re
import pymupdf
from PIL import Image
from typing import List, Dict, Any, Optional, Tuple, Union
from ..schemas import Asset, AssetRef

class ExtractedDiagram:
    def __init__(
        self,
        page_num: int,
        bbox: Tuple[float, float, float, float],
        image_bytes: bytes,
        ext: str = "webp",
        assigned_question: Optional[int] = None,
        assigned_option: Optional[str] = None,
        caption_context: Optional[str] = None
    ):
        self.page_num = page_num
        self.bbox = bbox # (x0, y0, x1, y1)
        self.image_bytes = image_bytes
        self.ext = ext
        self.assigned_question: Optional[int] = assigned_question
        self.assigned_option: Optional[str] = assigned_option
        self.caption_context: Optional[str] = caption_context
        self.public_url: Optional[str] = None
        self.asset_id: Optional[str] = None

class DiagramExtractor:
    """
    Extracts raster diagrams, graphs, and vector schematics (circuits,
    chemical reaction sequences, flowcharts, coordinate axes) from PDF pages.
    Composites them over a clean white background (eliminating black backgrounds),
    determines spatial question and option anchors, converts to WebP,
    and registers them into the canonical Asset registry.
    """

    def __init__(self, doc: pymupdf.Document, paper_id: str, output_base_dir: Optional[str] = None):
        self.doc = doc
        self.paper_id = paper_id
        self.output_base_dir = output_base_dir
        self.registered_assets: List[Asset] = []

    def extract_page_diagrams(self, page_index: int) -> List[ExtractedDiagram]:
        page = self.doc[page_index]
        page_num = page_index + 1
        page_rect = page.rect
        pw, ph = page_rect.width, page_rect.height
        diagrams: List[ExtractedDiagram] = []
        extracted_bboxes: List[pymupdf.Rect] = []

        # -------------------------------------------------------------------------
        # Spatial Anchor Preparation: Scan all text blocks for Question & Option labels
        # -------------------------------------------------------------------------
        text_blocks = page.get_text("blocks")
        q_locs: List[Tuple[int, float, float]] = [] # (q_num, y0, y1)

        for b in text_blocks:
            m = re.search(r'(?:^|\n|\b)(?:Q\s*\.?\s*|Question\s*)(\d+)\b', b[4], re.I)
            if m:
                try:
                    q_num = int(m.group(1))
                    q_locs.append((q_num, b[1], b[3]))
                except ValueError:
                    pass

        q_locs.sort(key=lambda x: x[1])

        def match_spatial_owner(d_y0: float, d_y1: float) -> Optional[int]:
            if not q_locs:
                return None
            for idx, (qn, qy0, qy1) in enumerate(q_locs):
                next_qy0 = q_locs[idx + 1][1] if idx + 1 < len(q_locs) else ph * 0.95
                if (qy0 - 15 <= d_y0 < next_qy0) or (qy0 <= (d_y0 + d_y1) / 2.0 < next_qy0):
                    return qn
            return None

        def match_option_label(d_bbox: Tuple[float, float, float, float]) -> Optional[str]:
            dx0, dy0, dx1, dy1 = d_bbox
            d_mid_x = (dx0 + dx1) / 2.0
            d_mid_y = (dy0 + dy1) / 2.0

            closest_label = None
            closest_dist = float("inf")

            for b in text_blocks:
                bx0, by0, bx1, by1, btext = b[:5]
                # Match both letters (A-D) and numbers (1-4)
                opt_m = re.search(r'\b(?:\(([1-4A-Da-d])\)|([1-4A-Da-d])[\.\)])\b', btext.strip())
                if opt_m:
                    raw_lbl = (opt_m.group(1) or opt_m.group(2)).upper()
                    canonical_lbl = {"1": "A", "2": "B", "3": "C", "4": "D"}.get(raw_lbl, raw_lbl)
                    b_mid_x = (bx0 + bx1) / 2.0
                    b_mid_y = (by0 + by1) / 2.0
                    dy = d_mid_y - b_mid_y
                    dx = d_mid_x - b_mid_x
                    dist = (dx**2 + dy**2) ** 0.5
                    if abs(by0 - dy0) < 120 and abs(bx0 - dx0) < 250 and dist < closest_dist:
                        closest_dist = dist
                        closest_label = canonical_lbl

            return closest_label

        def extract_nearby_keywords(d_bbox: Tuple[float, float, float, float]) -> str:
            dx0, dy0, dx1, dy1 = d_bbox
            words = []
            for b in text_blocks:
                bx0, by0, bx1, by1, btext = b[:5]
                if abs(by0 - dy0) < 60 or abs(by1 - dy1) < 60 or (dy0 <= by0 <= dy1):
                    clean = re.sub(r'[\n\r]+', ' ', btext).strip()
                    if clean and len(clean) > 4 and not re.match(r'^(?:Q\s*\.?\s*\d+|JEE|Paper|SECTION)', clean, re.I):
                        words.append(clean[:35])
            return "; ".join(words[:2]) if words else ""

        # -------------------------------------------------------------------------
        # 1. Extract raster images with their bounding boxes
        # -------------------------------------------------------------------------
        img_infos = page.get_image_info(xrefs=True)
        seen_xrefs = set()

        for info in img_infos:
            bbox = info.get("bbox")
            xref = info.get("xref")
            if not bbox or not xref or xref in seen_xrefs:
                continue
            seen_xrefs.add(xref)

            x0, y0, x1, y1 = bbox
            w = x1 - x0
            h = y1 - y0

            # Filter header/footer margin rules
            if y1 < ph * 0.08 or y0 > ph * 0.90:
                continue

            # Filter out tiny bullets, icons, or full-page background covers
            if w < 40 or h < 35:
                continue
            if (w / h > 10 and h < 20) or (h / w > 10 and w < 20):
                continue
            if w > pw * 0.95 and h > ph * 0.85:
                continue

            try:
                clip_rect = pymupdf.Rect(x0, y0, x1, y1) & page_rect
                pad_rect = pymupdf.Rect(
                    max(0, clip_rect.x0 - 2),
                    max(0, clip_rect.y0 - 2),
                    min(pw, clip_rect.x1 + 2),
                    min(ph, clip_rect.y1 + 2)
                )

                # Render sharp 160 DPI pixmap with white background (alpha=False)
                pix = page.get_pixmap(clip=pad_rect, dpi=160, alpha=False)
                pil_img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")

                webp_buffer = io.BytesIO()
                pil_img.save(webp_buffer, format="WEBP", quality=90)
                webp_bytes = webp_buffer.getvalue()

                assigned_q = match_spatial_owner(y0, y1)
                assigned_opt = match_option_label((x0, y0, x1, y1))
                nearby_kw = extract_nearby_keywords((x0, y0, x1, y1))

                diag = ExtractedDiagram(
                    page_num=page_num,
                    bbox=(x0, y0, x1, y1),
                    image_bytes=webp_bytes,
                    ext="webp",
                    assigned_question=assigned_q,
                    assigned_option=assigned_opt,
                    caption_context=nearby_kw
                )
                diagrams.append(diag)
                extracted_bboxes.append(clip_rect)
            except Exception:
                pass

        # -------------------------------------------------------------------------
        # 2. Extract vector schematics (chemical reaction schemes, flowcharts, circuits)
        # -------------------------------------------------------------------------
        try:
            # Filter drawing primitives (exclude outer border frames and header/footer rules)
            page_drawings = []
            for d in page.get_drawings():
                r = d["rect"]
                if r.y1 < ph * 0.08 or r.y0 > ph * 0.90:
                    continue
                # Table outlines or page rules: very long and very thin
                if (r.width > 250 and r.height < 3) or (r.height > 150 and r.width < 3):
                    continue
                # Outer full-page margins/borders
                if r.width > pw * 0.94 and r.height > ph * 0.70:
                    continue
                items = d.get("items", [])
                has_curve = any(it[0] == "c" for it in items)
                page_drawings.append({
                    "rect": r,
                    "items": items,
                    "has_curve": has_curve,
                })

            # Check question zones for vector schematics
            if q_locs and page_drawings:
                for idx, (q_num, q_y0, q_y1) in enumerate(q_locs):
                    next_y0 = q_locs[idx + 1][1] if idx + 1 < len(q_locs) else ph * 0.90
                    # Primitives situated in this question's vertical band
                    raw_q_draws = [d for d in page_drawings if q_y0 < d["rect"].y0 < next_y0]

                    # -----------------------------------------------------------------
                    # Filter out outer framing boxes and border lines BEFORE clustering!
                    # This prevents the whole question rectangle box from becoming the diagram cluster.
                    # -----------------------------------------------------------------
                    diagram_draw_objs = []
                    for d in raw_q_draws:
                        r = d["rect"]
                        # 1. Outer rectangular callout frame enclosing the question
                        #    (wide box spanning most of the question column width, without curves)
                        if r.width > pw * 0.50 and r.height > 30 and not d["has_curve"]:
                            continue
                        # 2. Horizontal border/ruling lines
                        if r.width > pw * 0.45 and r.height <= 5:
                            continue
                        # 3. Vertical border lines of framing boxes
                        if r.height > 30 and r.width <= 5:
                            continue
                        # 4. Rectangle that nearly spans the entire question band vertically
                        band_height = next_y0 - q_y0
                        if band_height > 20 and r.height > band_height * 0.65 and r.width > pw * 0.40:
                            continue
                        diagram_draw_objs.append(d)

                    # Only proceed if we have meaningful diagram primitives (arrows, rings, bonds, curves)
                    if len(diagram_draw_objs) >= 4:
                        cluster = diagram_draw_objs[0]["rect"]
                        for d in diagram_draw_objs[1:]:
                            cluster |= d["rect"]

                        has_curves = any(d["has_curve"] for d in diagram_draw_objs)
                        inner_rect = pymupdf.Rect(
                            cluster.x0 + cluster.width * 0.15,
                            cluster.y0 + cluster.height * 0.15,
                            cluster.x1 - cluster.width * 0.15,
                            cluster.y1 - cluster.height * 0.15
                        )
                        has_interior_drawings = any(inner_rect.intersects(d["rect"]) for d in diagram_draw_objs)

                        # If hollow border box with no interior drawings and no curves, skip!
                        if not has_curves and not has_interior_drawings:
                            continue

                        # If wide box (>60% of page width) without curves, skip text framing boxes
                        if cluster.width > pw * 0.60 and not has_curves:
                            continue

                        # If cluster spans most of the question band vertically and is wide, skip —
                        # it is likely the question's outer border/callout box, not a real diagram
                        band_height = next_y0 - q_y0
                        if band_height > 20 and cluster.height > band_height * 0.55 and cluster.width > pw * 0.45 and not has_curves:
                            continue

                        # Expand cluster ONLY to incorporate short chemical reagents and labels (<= 25 chars)
                        # inside or strictly adjacent to the diagram, NEVER the question stem or footnotes!
                        for b in text_blocks:
                            clean_btext = b[4].strip()
                            if len(clean_btext) <= 25 and not clean_btext.startswith("Use:"):
                                br = pymupdf.Rect(b[:4])
                                if br.y0 >= q_y1 and cluster.intersects(pymupdf.Rect(br.x0 - 15, br.y0 - 15, br.x1 + 15, br.y1 + 15)):
                                    cluster |= br

                        # Avoid overlap if an existing raster image already covers this area
                        if any(cluster.intersects(existing) for existing in extracted_bboxes):
                            continue

                        clip_rect = cluster & page_rect
                        if clip_rect.width >= 40 and clip_rect.height >= 30:
                            pad_rect = pymupdf.Rect(
                                max(0, clip_rect.x0 - 4),
                                max(0, clip_rect.y0 - 4),
                                min(pw, clip_rect.x1 + 4),
                                min(ph, clip_rect.y1 + 4)
                            )
                            pix = page.get_pixmap(clip=pad_rect, dpi=160, alpha=False)
                            pil_img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
                            webp_buf = io.BytesIO()
                            pil_img.save(webp_buf, format="WEBP", quality=90)

                            d_bbox = (clip_rect.x0, clip_rect.y0, clip_rect.x1, clip_rect.y1)
                            assigned_opt = match_option_label(d_bbox)
                            nearby_kw = extract_nearby_keywords(d_bbox)

                            diag = ExtractedDiagram(
                                page_num=page_num,
                                bbox=d_bbox,
                                image_bytes=webp_buf.getvalue(),
                                ext="webp",
                                assigned_question=q_num,
                                assigned_option=assigned_opt,
                                caption_context=nearby_kw
                            )
                            diagrams.append(diag)
                            extracted_bboxes.append(clip_rect)
            elif page_drawings and not q_locs:
                # Standalone diagram page (e.g. passage or unnumbered schematic)
                if len(page_drawings) >= 6:
                    cluster = page_drawings[0]
                    for r in page_drawings[1:]:
                        cluster |= r
                    if cluster.width >= 50 and cluster.height >= 40 and cluster.width < pw * 0.90:
                        clip_rect = cluster & page_rect
                        pad_rect = pymupdf.Rect(
                            max(0, clip_rect.x0 - 4),
                            max(0, clip_rect.y0 - 4),
                            min(pw, clip_rect.x1 + 4),
                            min(ph, clip_rect.y1 + 4)
                        )
                        pix = page.get_pixmap(clip=pad_rect, dpi=160, alpha=False)
                        pil_img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
                        webp_buf = io.BytesIO()
                        pil_img.save(webp_buf, format="WEBP", quality=90)
                        diag = ExtractedDiagram(
                            page_num=page_num,
                            bbox=(clip_rect.x0, clip_rect.y0, clip_rect.x1, clip_rect.y1),
                            image_bytes=webp_buf.getvalue(),
                            ext="webp"
                        )
                        diagrams.append(diag)
                        extracted_bboxes.append(clip_rect)
        except Exception:
            pass

        return diagrams

    def register_all_diagrams(self, all_diagrams: List[ExtractedDiagram]) -> List[Asset]:
        """Saves diagrams to public storage and builds the canonical Asset registry with spatial context."""
        self.registered_assets = []
        page_counters: Dict[int, int] = {}

        for diag in all_diagrams:
            p_num = diag.page_num
            idx = page_counters.get(p_num, 0) + 1
            page_counters[p_num] = idx

            asset_id = f"asset_p{p_num}_{idx}"
            diag.asset_id = asset_id
            filename = f"{asset_id}.{diag.ext}"

            url = None
            if self.output_base_dir:
                target_dir = os.path.join(self.output_base_dir, self.paper_id)
                os.makedirs(target_dir, exist_ok=True)
                file_path = os.path.join(target_dir, filename)
                with open(file_path, "wb") as f:
                    f.write(diag.image_bytes)
                url = f"/diagrams/{self.paper_id}/{filename}"
            else:
                import base64
                b64 = base64.b64encode(diag.image_bytes).decode("ascii")
                url = f"data:image/webp;base64,{b64}"

            diag.public_url = url

            desc_parts = [f"Diagram on page {p_num}"]
            if diag.assigned_question:
                desc_parts.append(f"physically situated inside Question {diag.assigned_question}")
            if diag.assigned_option:
                desc_parts.append(f"for Option ({diag.assigned_option})")
            if diag.caption_context:
                desc_parts.append(f"context: {diag.caption_context}")

            description = " | ".join(desc_parts)

            x0, y0, x1, y1 = diag.bbox
            self.registered_assets.append(Asset(
                id=asset_id,
                type="diagram",
                url=url,
                pageNumber=p_num,
                description=description,
                bbox=[round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2)],
                metadata={
                    "assignedQuestion": diag.assigned_question,
                    "assignedOption": diag.assigned_option,
                    "captionContext": diag.caption_context
                }
            ))

        return self.registered_assets
