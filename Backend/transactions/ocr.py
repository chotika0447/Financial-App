import os
import re
import tempfile
from datetime import datetime
from pathlib import Path

from .ocr_engine import run_ocr
from .slip_parser import parse_slip


def _get_texts(raw_pages):
    """Extract recognized text lines from PaddleOCR output."""
    lines = []
    for page in raw_pages:
        data = page.get("res", page)
        if not isinstance(data, dict):
            continue
        for item in data.get("rec_texts", []):
            text = str(item).strip()
            if text:
                lines.append(text)
    return lines


def read_receipt_data(image_path):
    """
    OCR an image and parse it.
    Accepts a filesystem path or a Django UploadedFile/file-like object.
    """
    temp_path = None
    try:
        if isinstance(image_path, (str, os.PathLike)):
            path = str(image_path)
        else:
            suffix = Path(getattr(image_path, "name", "receipt.jpg")).suffix or ".jpg"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
                if hasattr(image_path, "seek"):
                    image_path.seek(0)
                if hasattr(image_path, "chunks"):
                    for chunk in image_path.chunks():
                        temp_file.write(chunk)
                else:
                    temp_file.write(image_path.read())
                temp_path = temp_file.name
            path = temp_path

        raw_pages = run_ocr(path)
        lines = _get_texts(raw_pages)
        parsed = parse_slip(raw_pages)
        text = "\\n".join(lines)

        # Keep API-compatible text for downstream legacy amount/date extraction.
        if parsed.get("amount") is not None:
            text += f"\\nยอดโอน {parsed['amount']}"
        if parsed.get("date"):
            text += f"\\nวันที่ {parsed['date']}"

        return {"raw_text": text, "parsed": parsed}
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                import logging
                logging.getLogger(__name__).warning(
                    "OCR: failed to remove uploaded-image temp file",
                    exc_info=True,
                )


def read_receipt(image_path):
    """Compatibility wrapper for LINE bot callers expecting text only."""
    return read_receipt_data(image_path)["raw_text"]


def find_numbers(line):
    """Find numeric values that may represent amounts."""
    pattern = r"(?<!\\d)(\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.(\\d{1,2}))?(?!\\d)"
    results = []
    for match in re.finditer(pattern, line):
        integer_part = match.group(1).replace(",", "")
        decimal_part = (match.group(2) or "0").ljust(2, "0")
        try:
            results.append(float(f"{integer_part}.{decimal_part}"))
        except ValueError:
            continue
    return results


def extract_amount(text):
    """Find an amount adjacent to a known amount label."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    keywords = [
        "ยอดโอน", "ยอดชำระ", "จำนวนเงิน", "จำนวน", "ยอดรวม",
        "รวมสุทธิ", "สุทธิ", "amount", "total",
    ]
    for index, line in enumerate(lines):
        if any(word.casefold() in line.casefold() for word in keywords):
            for candidate in lines[index:index + 3]:
                if "ค่าธรรมเนียม" in candidate:
                    break
                numbers = find_numbers(candidate)
                if numbers:
                    return numbers[-1]
    return None


def estimate_7delivery_total(text):
    """Estimate 7Delivery total when the receipt item section is detected."""
    if "รายการสินค้า" not in text:
        return None
    item_text = text.split("รายการสินค้า")[-1]
    stop_words = ["M-Stamp", "ภารกิจช้อป", "สิทธิ์แลก", "ดูใบกำกับ", "ขอใบกำกับ"]
    prices = []
    for line in item_text.splitlines():
        if any(word in line for word in stop_words):
            break
        numbers = find_numbers(line)
        if numbers:
            prices.append(numbers[-1])
    return round(sum(prices), 2) if prices else None


def get_receipt_amount(text):
    """Return (amount, status) while preserving the existing API contract."""
    amount = extract_amount(text)
    if amount is not None:
        return amount, "confirmed_by_ocr"

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    raw_pages = [{"res": {"rec_texts": lines, "rec_scores": []}}]
    try:
        parsed = parse_slip(raw_pages)
        amount = parsed.get("amount")
        if amount is not None:
            return float(amount), "confirmed_by_ocr"
    except (TypeError, ValueError, KeyError):
        pass

    amount = estimate_7delivery_total(text)
    if amount is not None:
        return amount, "estimated_from_items"
    return None, "not_found"


def format_datetime(day, month, year, hour, minute):
    """Return date/time in Gregorian YYYY-MM-DD HH:MM format."""
    if year >= 2400:
        year -= 543
    elif year < 100:
        year += 1957
    try:
        return datetime(year, month, day, hour, minute).strftime("%Y-%m-%d %H:%M")
    except ValueError:
        return None


def extract_datetime(text):
    """Extract date/time from OCR text, including Thai digits and month names."""
    for digit, replacement in zip("๐๑๒๓๔๕๖๗๘๙", "0123456789"):
        text = text.replace(digit, replacement)

    numeric_pattern = (
        r"(?<!\\d)(\\d{1,2})[/\\-](\\d{1,2})[/\\-](\\d{2,4})"
        r"\\s*(?:\\||-|,)?\\s*(\\d{1,2}):(\\d{2})(?!\\d)"
    )
    match = re.search(numeric_pattern, text)
    if match:
        day, month, year, hour, minute = map(int, match.groups())
        return format_datetime(day, month, year, hour, minute)

    months = {
        "ม.ค.": 1, "ก.พ.": 2, "มี.ค.": 3,
        "เม.ย.": 4, "พ.ค.": 5, "มิ.ย.": 6,
        "ก.ค.": 7, "ส.ค.": 8, "ก.ย.": 9,
        "ต.ค.": 10, "พ.ย.": 11, "ธ.ค.": 12,
    }
    for month_name, month_number in months.items():
        pattern = (
            rf"(\\d{{1,2}})\\s*{re.escape(month_name)}\\s*"
            rf"(\\d{{2,4}})\\s*(?:-|,)?\\s*"
            rf"(\\d{{1,2}}):(\\d{{2}})"
        )
        match = re.search(pattern, text)
        if match:
            day, year, hour, minute = map(int, match.groups())
            return format_datetime(day, month_number, year, hour, minute)
    return None
