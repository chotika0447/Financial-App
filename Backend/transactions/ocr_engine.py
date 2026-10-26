import os

os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "False"
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

import json
import logging
import time
from functools import lru_cache
from paddleocr import PaddleOCR

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_ocr_model():
    logger.info("Initializing PaddleOCR mobile model...")

    return PaddleOCR(
        lang="th",
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_recognition_model_name="PP-OCRv5_mobile_rec",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )


def run_ocr(image_path):
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