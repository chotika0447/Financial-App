import os
import logging
import time

# ปิด oneDNN เพื่อหลีกเลี่ยงปัญหา CPU inference
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "False"
logger = logging.getLogger(__name__)

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
    """รับ path ของภาพและคืนผล OCR ดิบ พร้อมวัดเวลา"""
    start = time.perf_counter()

    model_start = time.perf_counter()
    ocr = get_ocr_model()
    model_seconds = time.perf_counter() - model_start

    predict_start = time.perf_counter()
    results = ocr.predict(str(image_path))
    predict_seconds = time.perf_counter() - predict_start

    raw_pages = []

    for page in results:
        page_data = page.json

        if isinstance(page_data, str):
            page_data = json.loads(page_data)

        raw_pages.append(page_data)

    logger.info(
        "OCR timing: model=%.2fs predict=%.2fs total=%.2fs pages=%d",
        model_seconds,
        predict_seconds,
        time.perf_counter() - start,
        len(raw_pages),
    )

    return raw_pages