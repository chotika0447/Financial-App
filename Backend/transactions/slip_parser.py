"""Parse OCR text from Thai bank transfer slips. No database or network access."""
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

THAI_MONTHS = {"ม.ค.": 1, "ก.พ.": 2, "มี.ค.": 3, "เม.ย.": 4, "พ.ค.": 5, "มิ.ย.": 6, "ก.ค.": 7, "ส.ค.": 8, "ก.ย.": 9, "ต.ค.": 10, "พ.ย.": 11, "ธ.ค.": 12}
SENDER_KEYWORDS = [r"จาก", r"FROM", r"ผู้โอน", r"ชื่อผู้โอน", r"ผู้ชำระ", r"ผู้ชำระเงิน", r"โอนจาก", r"ต้นทาง"]
RECEIVER_KEYWORDS = [r"ไปยัง", r"TO", r"ผู้รับ", r"ชื่อผู้รับ", r"ผู้รับเงิน", r"ผู้รับโอน", r"ปลายทาง", r"โอนไปยัง"]
AMOUNT_KEYWORDS = [r"จำนวนเงิน", r"จำนวน", r"AMOUNT", r"TRANSFER\s+AMOUNT", r"TOTAL\s+AMOUNT", r"ยอดเงิน", r"ยอดโอน", r"ยอดชำระ", r"เงินที่โอน", r"ยอดชำระสุทธิ", r"ยอดสุทธิ", r"สุทธิ", r"NET\s+TOTAL", r"GRAND\s+TOTAL"]
MEMO_KEYWORDS = [r"บันทึกช่วยจำ", r"NOTE", r"MEMO", r"REMARKS?", r"หมายเหตุ", r"รายละเอียด"]
FEE_KEYWORDS = [r"ค่าธรรมเนียม", r"FEE", r"SERVICE\s+FEE", r"TRANSACTION\s+FEE"]
PROVIDER_INFO_KEYWORDS = [r"ข้อมูลเพิ่มเติมจากผู้ให้บริการ", r"ADDITIONAL\s+INFORMATION", r"PROVIDER\s+INFORMATION", r"ข้อมูลเพิ่มเติม"]
IGNORE_TEXT = {"จาก", "ไปยัง", "จำนวนเงิน", "บันทึกช่วยจำ", "ค่าธรรมเนียม", "ข้อมูลเพิ่มเติมจากผู้ให้บริการ", "ผู้รับเงินสามารถสแกนคิวอาร์โค้ดนี้", "เพื่อตรวจสอบสถานะการโอนเงิน", "เพื่อตรวจสอบสถานะการจ่ายเงิน", "เพื่อตรวจสอบสถานะการเติมเงิน"}


def is_thai_text(value):
    return bool(value and re.search(r"[ก-๙]", str(value)))


def get_ocr_texts(raw_pages, min_confidence=0.5):
    """Read PaddleOCR pages safely, excluding low-confidence lines."""
    lines = []
    for page in raw_pages or []:
        if not isinstance(page, dict):
            continue
        data = page.get("res") or page
        if not isinstance(data, dict):
            continue
        texts = data.get("rec_texts") or []
        scores = data.get("rec_scores") or []
        if not isinstance(texts, (list, tuple)):
            continue
        if not isinstance(scores, (list, tuple)):
            scores = []
        for index, value in enumerate(texts):
            text = str(value or "").strip()
            if not text:
                continue
            score = None
            if index < len(scores):
                try:
                    score = float(scores[index])
                except (TypeError, ValueError):
                    pass
            if score is not None and score < min_confidence:
                continue
            lines.append({"text": text, "confidence": score})
    return lines


def is_valid_name(text):
    if not isinstance(text, str) or not text.strip():
        return False
    text = text.strip()
    if text in IGNORE_TEXT or re.search(r"\d", text):
        return False
    has_letters = re.search(r"[ก-๙a-zA-Z]", text)
    valid_characters = re.fullmatch(r"[ก-๙a-zA-Z\s.\-]+", text)
    return bool(has_letters and valid_characters)


def _label_pattern(keywords):
    sorted_keywords = sorted(keywords, key=len, reverse=True)
    patterns = []
    for keyword in sorted_keywords:
        patterns.append(rf"(?<![A-Za-z])(?:{keyword})(?![A-Za-z])")
    return "|".join(patterns)


def _is_other_label(text):
    all_keywords = (
        SENDER_KEYWORDS + RECEIVER_KEYWORDS + AMOUNT_KEYWORDS
        + MEMO_KEYWORDS + FEE_KEYWORDS + PROVIDER_INFO_KEYWORDS
    )
    pattern = rf"^\s*(?:{_label_pattern(all_keywords)})\s*[:：]?"
    return re.match(pattern, text, re.IGNORECASE) is not None


def find_person_near_label(lines, keywords):
    pattern = _label_pattern(keywords)
    for index, item in enumerate(lines):
        text = str(item.get("text") or "").strip()
        match = re.match(rf"^\s*(?:{pattern})\s*[:：]?\s*(.*?)\s*$", text, re.IGNORECASE)
        if not match:
            continue
        inline = match.group(1).strip()
        if is_valid_name(inline) and not _is_other_label(inline):
            return inline
        for next_index in range(index + 1, min(index + 3, len(lines))):
            candidate = str(lines[next_index].get("text") or "").strip()
            if _is_other_label(candidate):
                break
            if is_valid_name(candidate):
                return candidate
        # Do not borrow an unrelated name from preceding lines.
        return None
    return None


def find_people_by_order(lines):
    ignored = ["จ่ายบิลสำเร็จ", "โอนเงินสำเร็จ", "เติมเงินสำเร็จ", "ผู้รับเงินสามารถสแกน", "เพื่อตรวจสอบสถานะ", "ข้อมูลเพิ่มเติม", "จำนวนเงิน", "บันทึกช่วยจำ", "ค่าธรรมเนียม"]
    candidates = []
    for item in lines:
        text = str(item.get("text") or "").strip()
        should_ignore = False
        for phrase in ignored:
            if phrase.casefold() in text.casefold():
                should_ignore = True
                break
        if should_ignore:
            continue
        if is_valid_name(text) and not _is_other_label(text):
            candidates.append(text)
    if len(candidates) >= 2:
        return candidates[0], candidates[1]
    return None, None


def parse_date(lines):
    """Accept Thai abbreviated dates and numeric DD/MM/YYYY dates."""
    months = "|".join(re.escape(m) for m in sorted(THAI_MONTHS, key=len, reverse=True))
    thai = re.compile(rf"(?<!\d)(\d{{1,2}})\s*({months})\s*(\d{{2,4}})(?!\d)")
    numeric = re.compile(r"(?<!\d)(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?!\d)")
    for item in lines:
        text = str(item.get("text") or "")
        match = thai.search(text)
        if match:
            day, month, year = int(match[1]), THAI_MONTHS[match[2]], int(match[3])
        else:
            match = numeric.search(text)
            if not match:
                continue
            day, month, year = map(int, match.groups())
        if year < 100:
            # Thai slips with two-digit Buddhist years (e.g. 69 = 2569).
            year += 2500
        if year >= 2400:
            year -= 543
        try:
            return datetime(year, month, day).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def parse_time(lines):
    pattern = re.compile(r"(?<!\d)([01]?\d|2[0-3]):([0-5]\d)(?!\d)")
    for item in lines:
        match = pattern.search(str(item.get("text") or ""))
        if match:
            return f"{int(match.group(1)):02d}:{int(match.group(2)):02d}"
    return None


def parse_amount(lines):
    """Extract a labeled payment amount, prioritizing net paid over subtotals.

    Never use arbitrary account numbers, dates, item prices or reference IDs.
    """
    number = re.compile(r"(?<![\w.,/-])(-?\d[\d,]*)(?:\.(\d{1,2}))?(?![\w.,/-])")
    groups = (
        (r"ยอดชำระสุทธิ", r"ยอดสุทธิ", r"ยอดชำระรวม", r"สุทธิ", r"NET\s+TOTAL", r"NET\s+BAHT", r"GRAND\s+TOTAL", r"ยอดจ่ายจริง", r"จำนวนเงินที่ต้องชำระ", r"รวมเงินที่ต้องชำระทั้งสิ้น", r"รวมเงินที่ต้องชำระ", r"ยอดเงินที่ต้องชำระ"),
        (r"จำนวนเงิน", r"ยอดโอน", r"เงินที่โอน", r"TRANSFER\s+AMOUNT", r"TOTAL\s+AMOUNT", r"ยอดชำระ", r"ยอดเงิน", r"AMOUNT", r"จำนวน(?=\s*[:：])"),
        (r"ยอดรวม", r"TOTAL", r"TOTAL\s+BAHT", r"ยอดรวมสุทธิ"),
    )
    excluded = re.compile(r"ค่าธรรมเนียม|ภาษี|VAT|SERVICE\s*CHARGE|ส่วนลด|DISCOUNT|เงินทอน|CHANGE|BEFORE\s+TAX", re.I)
    for group in groups:
        label = _label_pattern(group)
        for i, item in enumerate(lines):
            text = str(item.get("text") or "").strip()
            if excluded.search(text):
                continue
            found = re.match(rf"^\s*(?:{label})\s*[:：]?\s*(.*)$", text, re.I)
            if not found:
                continue
            candidates = [found.group(1).strip()]
            if i + 1 < len(lines):
                nxt = str(lines[i + 1].get("text") or "").strip()
                if not _is_other_label(nxt) and not excluded.search(nxt):
                    candidates.append(nxt)
            for candidate in candidates:
                # Ignore dates and long IDs, and prefer decimal amounts.
                matches = []
                for m in number.finditer(candidate):
                    whole, fractional = m.groups()
                    digits = whole.lstrip("-")
                    if len(digits.replace(",", "")) > 9:
                        continue
                    if "," in digits and not re.fullmatch(r"\d{1,3}(?:,\d{3})+", digits):
                        continue
                    try:
                        value = Decimal(whole.replace(",", "") + ("." + fractional if fractional else ""))
                    except InvalidOperation:
                        continue
                    if value.is_finite() and Decimal("0") < value <= Decimal("999999.99"):
                        matches.append((fractional is not None, m.start(), value))
                if matches:
                    # If OCR combines a quantity and a price on one line,
                    # the decimal-formatted amount is more reliable.
                    matches.sort(key=lambda x: (not x[0], x[1]))
                    return f"{matches[0][2]:.2f}"
    return None


def find_labeled_value(lines, label_pattern):
    for index, item in enumerate(lines):
        text = str(item.get("text") or "").strip()
        match = re.match(rf"^\s*(?:{label_pattern})\s*[:：]?\s*(.*?)\s*$", text, re.IGNORECASE)
        if not match:
            continue
        value = match.group(1).strip()
        if value:
            return value if is_thai_text(value) else None
        if index + 1 < len(lines):
            next_value = str(lines[index + 1].get("text") or "").strip()
            if next_value and next_value not in IGNORE_TEXT and is_thai_text(next_value) and not _is_other_label(next_value):
                return next_value
        return None
    return None


def parse_notes(lines):
    return {
        "memo": find_labeled_value(lines, "|".join(MEMO_KEYWORDS)),
        "fee": find_labeled_value(lines, "|".join(FEE_KEYWORDS)),
        "provider_info": find_labeled_value(lines, "|".join(PROVIDER_INFO_KEYWORDS)),
    }


def detect_receipt_item(lines):
    """Use a conservative generic label for known receipt types."""
    text = " ".join(str(item.get("text") or "") for item in lines).casefold()
    if "cafe amazon" in text or "café amazon" in text:
        return "ซื้อเครื่องดื่ม"
    if "7-eleven" in text or "cp all" in text:
        return "ซื้อสินค้าที่ 7-Eleven"
    if "การไฟฟ้า" in text or "ค่าไฟฟ้า" in text:
        return "ค่าไฟฟ้า"
    if "การประปา" in text or "ค่าน้ำประปา" in text:
        return "ค่าน้ำประปา"
    return None


def parse_slip(raw_pages):
    lines = get_ocr_texts(raw_pages)
    date = parse_date(lines)
    time = parse_time(lines)
    sender = find_person_near_label(lines, SENDER_KEYWORDS)
    receiver = find_person_near_label(lines, RECEIVER_KEYWORDS)
    amount = parse_amount(lines)
    note = parse_notes(lines)
    needs_review = (
        not date
        or not is_valid_name(sender)
        or not is_valid_name(receiver)
        or amount is None
    )
    return {
        "date": date,
        "time": time,
        "sender": sender,
        "receiver": receiver,
        "amount": amount,
        "item_name": detect_receipt_item(lines),
        "note": note,
        "needs_review": bool(needs_review),
        "ocr_text": [item["text"] for item in lines],
    }
