
import logging
import os
import time
import socket
import ssl

from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

logger = logging.getLogger(__name__)

OCR_MODEL = "PaddleOCR-VL-1.6"
OCR_HOST = "paddleocr.aistudio-app.com"


def _to_dict(value):
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
    data = _to_dict(page)

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

    raise ValueError("Cannot extract text from PaddleOCR-VL result")


def _check_tls_connection():
    """ตรวจสอบว่า Render เชื่อมต่อ HTTPS ไปยัง PaddleOCR ได้หรือไม่"""

    start = time.perf_counter()

    try:
        context = ssl.create_default_context()

        with socket.create_connection(
            (OCR_HOST, 443),
            timeout=15,
        ) as sock:

            with context.wrap_socket(
                sock,
                server_hostname=OCR_HOST,
            ) as secure_sock:

                logger.info(
                    "OCR TLS CHECK: SUCCESS host=%s version=%s elapsed=%.2fs",
                    OCR_HOST,
                    secure_sock.version(),
                    time.perf_counter() - start,
                )

                return True

    except Exception:
        logger.exception(
            "OCR TLS CHECK: FAILED host=%s elapsed=%.2fs",
            OCR_HOST,
            time.perf_counter() - start,
        )

        return False


def _is_network_error(error):
    """ตรวจสอบว่า Error เกิดจากการเชื่อมต่อเครือข่ายหรือ SSL หรือไม่"""

    current = error

    while current is not None:
        error_name = type(current).__name__.lower()
        error_message = str(current).lower()

        if any(keyword in error_name for keyword in (
            "networkerror",
            "sslerror",
            "connectionerror",
            "timeout",
        )):
            return True

        if any(keyword in error_message for keyword in (
            "ssl",
            "connection failed",
            "connection reset",
            "connection aborted",
            "connection refused",
            "timed out",
            "eof occurred",
            "max retries exceeded",
        )):
            return True

        current = current.__cause__ or current.__context__

    return False


def run_ocr(file_url):
    start = time.perf_counter()

    token = os.getenv("PADDLEOCR_ACCESS_TOKEN")

    if not token:
        raise RuntimeError(
            "PADDLEOCR_ACCESS_TOKEN is not configured"
        )

    if not file_url or not file_url.startswith("https://"):
        raise ValueError("Invalid OCR image URL")

    logger.info(
        "OCR API: starting model=%s source=Supabase Signed URL",
        OCR_MODEL,
    )

    # ตรวจสอบ TLS ก่อนเรียก PaddleOCR
    _check_tls_connection()

    result = None

    # ลองส่งรูปสูงสุด 2 ครั้ง
    for attempt in range(1, 3):
        client = None
        attempt_start = time.perf_counter()

        try:
            logger.info(
                "OCR API: submitting image attempt=%d/2",
                attempt,
            )

            client = PaddleOCRClient(
                token=token,
                request_timeout=300,
                poll_timeout=600,
            )

            result = client.parse_document(
                file_url=file_url,
                model=OCR_MODEL,
            )

            logger.info(
                "OCR API: submission successful attempt=%d elapsed=%.2fs",
                attempt,
                time.perf_counter() - attempt_start,
            )

            break

        except Exception as error:
            logger.exception(
                "OCR API: submission failed attempt=%d/2 elapsed=%.2fs",
                attempt,
                time.perf_counter() - attempt_start,
            )

            if attempt == 1 and _is_network_error(error):
                logger.warning(
                    "OCR API: network error detected, retrying with a new client"
                )
                continue

            raise

        finally:
            if client is not None:
                try:
                    client.close()
                except Exception:
                    logger.warning(
                        "OCR API: failed to close client",
                        exc_info=True,
                    )

    if result is None:
        raise RuntimeError("PaddleOCR API returned no result")

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
        raise ValueError("PaddleOCR API returned no pages")

    logger.info(
        "OCR API: completed model=%s pages=%d total=%.2fs",
        OCR_MODEL,
        len(raw_pages),
        time.perf_counter() - start,
    )

    return raw_pages

