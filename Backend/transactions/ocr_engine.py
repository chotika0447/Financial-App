
import os

# ปิด oneDNN เพื่อหลีกเลี่ยงปัญหา CPU inference
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "False"

import json

from functools import lru_cache

from paddleocr import PaddleOCR


@lru_cache(maxsize=1)
def get_ocr_model():
    """สร้างโมเดลครั้งเดียวและนำกลับมาใช้ซ้ำ"""
    return PaddleOCR(
        lang="th",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )


def run_ocr(image_path):
    """รับ path ของภาพและคืนผล OCR ดิบ"""
    ocr = get_ocr_model()
    results = ocr.predict(str(image_path))

    raw_pages = []

    for page in results:
        page_data = page.json

        if isinstance(page_data, str):
            page_data = json.loads(page_data)

        raw_pages.append(page_data)

    return raw_pages
