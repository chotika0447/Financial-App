import os

# ตั้งค่าก่อนเริ่มใช้ PaddleOCR
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "False"
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

import json
import logging
import tempfile
import time

from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageOps
from paddleocr import PaddleOCR



logger = logging.getLogger(__name__)

MAX_IMAGE_SIDE = 1600
JPEG_QUALITY = 90


@lru_cache(maxsize=1)
def get_ocr_model():
    logger.info("OCR: initializing Thai mobile model")

    model = PaddleOCR(
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_recognition_model_name="th_PP-OCRv5_mobile_rec",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )

    logger.info("OCR: model initialized successfully")
    return model


def prepare_image(image_path):
    """
    ปรับทิศทางภาพและลดขนาดภาพขนาดใหญ่ก่อนทำ OCR
    คืน path ของไฟล์ชั่วคราวที่ต้องลบหลังใช้งาน
    """
    temp_path = None

    try:
        with Image.open(image_path) as original:
            image = ImageOps.exif_transpose(original)
            image.load()

            width, height = image.size

            if width <= 0 or height <= 0:
                raise ValueError("Invalid image dimensions")

            scale = min(
                1.0,
                MAX_IMAGE_SIDE / max(width, height),
            )

            if scale < 1.0:
                new_size = (
                    max(1, round(width * scale)),
                    max(1, round(height * scale)),
                )
                image = image.resize(
                    new_size,
                    Image.Resampling.LANCZOS,
                )

            image = image.convert("RGB")

            with tempfile.NamedTemporaryFile(
                suffix=".jpg",
                delete=False,
            ) as temp_file:
                temp_path = temp_file.name

            image.save(
                temp_path,
                format="JPEG",
                quality=JPEG_QUALITY,
                optimize=True,
            )

            logger.info(
                "OCR: image prepared original=%dx%d resized=%dx%d",
                width,
                height,
                image.width,
                image.height,
            )

        return temp_path

    except Exception:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        raise


def run_ocr(image_path):
    start = time.perf_counter()
    prepared_path = None

    try:
        logger.info("OCR: preparing input image")
        prepared_path = prepare_image(image_path)

        logger.info("OCR: loading cached model if available")
        model_start = time.perf_counter()
        ocr = get_ocr_model()
        model_seconds = time.perf_counter() - model_start

        logger.info(
            "OCR: starting prediction model_ready_in=%.2fs",
            model_seconds,
        )

        predict_start = time.perf_counter()
        results = ocr.predict(prepared_path)
        predict_seconds = time.perf_counter() - predict_start

        raw_pages = []

        for page in results:
            page_data = page.json

            if isinstance(page_data, str):
                page_data = json.loads(page_data)

            raw_pages.append(page_data)

        logger.info(
            "OCR: completed model=%.2fs predict=%.2fs "
            "total=%.2fs pages=%d",
            model_seconds,
            predict_seconds,
            time.perf_counter() - start,
            len(raw_pages),
        )

        return raw_pages

    except Exception:
        logger.exception(
            "OCR: failed after %.2f seconds",
            time.perf_counter() - start,
        )
        raise

    finally:
        if prepared_path and os.path.exists(prepared_path):
            try:
                os.remove(prepared_path)
            except OSError:
                logger.warning(
                    "OCR: could not remove temporary image",
                    exc_info=True,
                )
