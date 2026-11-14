import logging
import os
import socket
import ssl
import time
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv
from paddleocr import PaddleOCRClient

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


def _find_blocks(data):
    """ค้นหาบล็อกข้อความในผลลัพธ์ OCR"""
    if isinstance(data, dict):
        blocks = data.get("parsing_res_list")
        if isinstance(blocks, list):
            return blocks

        for value in data.values():
            found = _find_blocks(value)
            if found:
                return found

    elif isinstance(data, list):
        for value in data:
            found = _find_blocks(value)
            if found:
                return found

    return []


def _find_markdown(data):
    """ค้นหาข้อความสำรอง หากผลลัพธ์ไม่มีบล็อกข้อความ"""
    if isinstance(data, dict):
        for key in ("markdown_text", "text"):
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                return value

        for value in data.values():
            found = _find_markdown(value)
            if found:
                return found

    return None


def _extract_page_text(page):
    data = _to_dict(page)
    blocks = _find_blocks(data)

    if blocks:
        texts = []
        for block in blocks:
            content = _to_dict(block).get("block_content")
            if isinstance(content, str) and content.strip():
                texts.append(content.strip())

        if texts:
            return texts

    markdown = _find_markdown(data)
    if markdown:
        return [line.strip() for line in markdown.splitlines() if line.strip()]

    raise ValueError("Cannot extract text from PaddleOCR-VL result")


def _is_valid_image_url(file_url):
    """รับเฉพาะ HTTPS URL ที่ไม่มีช่องว่างหรือข้อมูลล็อกอินใน URL"""
    if not isinstance(file_url, str) or not file_url:
        return False

    for char in file_url:
        if char.isspace():
            return False

    try:
        parsed_url = urlsplit(file_url)
        return (
            parsed_url.scheme == "https"
            and bool(parsed_url.hostname)
            and not parsed_url.username
            and not parsed_url.password
        )
    except ValueError:
        return False


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
            "connectionreseterror",
            "connectionabortederror",
            "connectionrefusederror",
            "brokenpipeerror",
            "timeout",
        )):
            return True

        if any(keyword in error_message for keyword in (
            "ssl",
            "connection failed",
            "connection reset",
            "connection aborted",
            "connection refused",
            "broken pipe",
            "timed out",
            "eof occurred",
            "max retries exceeded",
        )):
            return True

        current = current.__cause__ or current.__context__

    return False


def run_ocr(file_url):
    start = time.perf_counter()

    token = (os.getenv("PADDLEOCR_ACCESS_TOKEN") or "").strip()

    if not token:
        raise RuntimeError(
            "PADDLEOCR_ACCESS_TOKEN is not configured"
        )

    if not _is_valid_image_url(file_url):
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
                request_timeout=60,
                poll_timeout=120,
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

                time.sleep(2)  # รอ 2 วินาทีก่อนลองใหม่
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

    pages = getattr(result, "pages", None)
    if not isinstance(pages, (list, tuple)) or not pages:
        raise ValueError("PaddleOCR API returned no valid pages")

    raw_pages = []

    for page in pages:
        texts = _extract_page_text(page)

        raw_pages.append({
            "res": {
                "rec_texts": texts,
                "rec_scores": [],
            }
        })

    if not any(page["res"]["rec_texts"] for page in raw_pages):
        raise ValueError("PaddleOCR API returned no readable text")

    logger.info(
        "OCR API: completed model=%s pages=%d total=%.2fs",
        OCR_MODEL,
        len(raw_pages),
        time.perf_counter() - start,
    )

    return raw_pages

