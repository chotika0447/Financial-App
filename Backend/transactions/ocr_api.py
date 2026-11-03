
import logging
import os
import time

from pathlib import Path
from dotenv import load_dotenv
from paddleocr import PaddleOCRClient

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

logger = logging.getLogger(__name__)

OCR_MODEL = "PaddleOCR-VL-1.6"


def _to_dict(value):
    """แปลงผลลัพธ์ SDK เป็น dict เพื่อให้อ่านข้อมูลได้หลายรูปแบบ"""

    if isinstance(value, dict):
        return value

    if hasattr(value, "model_dump"):
        return value.model_dump()

    if hasattr(value, "dict"):
        return value.dict()

    if hasattr(value, "__dict__"):
        return vars(value)

    return {}


def _extract_page_text(page):
    """
    ดึงข้อความจากผลลัพธ์ PaddleOCR-VL-1.6
    รองรับทั้ง parsing_res_list และ markdown_text
    """

    data = _to_dict(page)

    # ค้นหา parsing_res_list ภายในผลลัพธ์
    def find_blocks(obj):
        if isinstance(obj, dict):
            blocks = obj.get("parsing_res_list")

            if isinstance(blocks, list):
                return blocks

            for value in obj.values():
                found = find_blocks(value)

                if found:
                    return found

        elif isinstance(obj, list):
            for value in obj:
                found = find_blocks(value)

                if found:
                    return found

        return []

    blocks = find_blocks(data)

    if blocks:
        texts = []

        for block in blocks:
            block_data = _to_dict(block)
            content = block_data.get("block_content")

            if content:
                texts.append(str(content).strip())

        if texts:
            return texts

    # กรณีผลลัพธ์มี Markdown
    def find_markdown(obj):
        if isinstance(obj, dict):
            for key in ("markdown_text", "text"):
                value = obj.get(key)

                if isinstance(value, str) and value.strip():
                    return value

            for value in obj.values():
                found = find_markdown(value)

                if found:
                    return found

        return None

    markdown = find_markdown(data)

    if markdown:
        return [
            line.strip()
            for line in markdown.splitlines()
            if line.strip()
        ]

    raise ValueError(
        "Cannot extract text from PaddleOCR-VL result"
    )


def run_ocr(image_path):
    """
    ส่งภาพไปประมวลผลด้วย PaddleOCR Official API
    ใช้ PaddleOCR-VL-1.6
    คืนข้อมูลในรูปแบบที่ slip_parser.py เดิมรองรับ
    """

    start = time.perf_counter()

    token = os.getenv("PADDLEOCR_ACCESS_TOKEN")

    if not token:
        raise RuntimeError(
            "PADDLEOCR_ACCESS_TOKEN is not configured"
        )

    image_path = str(Path(image_path).resolve())

    if not os.path.isfile(image_path):
        raise FileNotFoundError(
            f"OCR image not found: {image_path}"
        )

    client = None

    try:
        logger.info(
            "OCR API: submitting image model=%s",
            OCR_MODEL,
        )

        client = PaddleOCRClient(
            token=token,
            request_timeout=300,
            poll_timeout=600,
        )

        result = client.parse_document(
            file_path=image_path,
            model=OCR_MODEL,
        )

        raw_pages = []

        for page in result.pages:
            texts = _extract_page_text(page)

            raw_pages.append({
                "res": {
                    "rec_texts": texts,
                    "rec_scores": [],
                }
            })

        if not raw_pages:
            raise ValueError(
                "PaddleOCR API returned no pages"
            )

        logger.info(
            "OCR API: completed model=%s pages=%d "
            "total=%.2fs",
            OCR_MODEL,
            len(raw_pages),
            time.perf_counter() - start,
        )

        return raw_pages

    except Exception:
        logger.exception(
            "OCR API: failed after %.2fs",
            time.perf_counter() - start,
        )
        raise

    finally:
        if client is not None:
            client.close()
