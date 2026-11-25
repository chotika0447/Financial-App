"""Parse OCR text from Thai bank transfer slips. No database or network access."""
import re
import unicodedata
from datetime import datetime
from decimal import Decimal, InvalidOperation
from functools import lru_cache
from html.parser import HTMLParser

THAI_MONTHS = {
    'ม.ค.': 1,
    'ก.พ.': 2,
    'มี.ค.': 3,
    'เม.ย.': 4,
    'พ.ค.': 5,
    'มิ.ย.': 6,
    'ก.ค.': 7,
    'ส.ค.': 8,
    'ก.ย.': 9,
    'ต.ค.': 10,
    'พ.ย.': 11,
    'ธ.ค.': 12,
}
THAI_MONTHS_FULL = {
    'มกราคม': 1,
    'กุมภาพันธ์': 2,
    'มีนาคม': 3,
    'เมษายน': 4,
    'พฤษภาคม': 5,
    'มิถุนายน': 6,
    'กรกฎาคม': 7,
    'สิงหาคม': 8,
    'กันยายน': 9,
    'ตุลาคม': 10,
    'พฤศจิกายน': 11,
    'ธันวาคม': 12,
}
SENDER_KEYWORDS = [r"จาก", r"FROM", r"ผู้โอน", r"ชื่อผู้โอน", r"ผู้ชำระ", r"ผู้ชำระเงิน", r"โอนจาก", r"ต้นทาง"]
RECEIVER_KEYWORDS = [
    'ไปยัง',
    'TO',
    'ผู้รับ',
    'ชื่อผู้รับ',
    'ผู้รับเงิน',
    'ผู้รับโอน',
    'ปลายทาง',
    'โอนไปยัง',
    'ถึง',
]
AMOUNT_KEYWORDS = [
    'จำนวนเงิน',
    'จำนวน',
    'AMOUNT',
    'TRANSFER\\s+AMOUNT',
    'TOTAL\\s+AMOUNT',
    'ยอดเงิน',
    'ยอดโอน',
    'ยอดชำระ',
    'เงินที่โอน',
    'จำนวนเงินที่ชำระ',
    'ยอดชำระจริง',
    'AMOUNT\\s+DUE',
    'TOTAL\\s+DUE',
    'ยอดชำระสุทธิ',
    'ยอดสุทธิ',
    'สุทธิ',
    'NET\\s+TOTAL',
    'GRAND\\s+TOTAL',
]
MEMO_KEYWORDS = [r"บันทึกช่วยจำ", r"NOTE", r"MEMO", r"REMARKS?", r"หมายเหตุ", r"รายละเอียด"]
FEE_KEYWORDS = [r"ค่าธรรมเนียม", r"FEE", r"SERVICE\s+FEE", r"TRANSACTION\s+FEE"]
PROVIDER_INFO_KEYWORDS = [
    'ข้อมูลเพิ่มเติมจากผู้ให้บริการ',
    'ADDITIONAL\\s+INFORMATION',
    'PROVIDER\\s+INFORMATION',
    'ข้อมูลเพิ่มเติม',
]
IGNORE_TEXT = {
    'จาก',
    'ไปยัง',
    'จำนวนเงิน',
    'บันทึกช่วยจำ',
    'ค่าธรรมเนียม',
    'ข้อมูลเพิ่มเติมจากผู้ให้บริการ',
    'ผู้รับเงินสามารถสแกนคิวอาร์โค้ดนี้',
    'เพื่อตรวจสอบสถานะการโอนเงิน',
    'เพื่อตรวจสอบสถานะการจ่ายเงิน',
    'เพื่อตรวจสอบสถานะการเติมเงิน',
}
BANK_NAMES = {
    'กสิกรไทย',
    'ไทยพาณิชย์',
    'กรุงเทพ',
    'กรุงศรี',
    'กรุงศรีอยุธยา',
    'ทหารไทยธนชาต',
    'ออมสิน',
    'ธ.ก.ส.',
    'ซีไอเอ็มบี',
    'ยูโอบี',
    'ทิสโก้',
    'เกียรตินาคินภัทร',
    'แลนด์ แอนด์ เฮ้าส์',
    'พร้อมเพย์',
    'กรุงไทย',
}

_ALL_LABEL_KEYWORDS = tuple(
    SENDER_KEYWORDS + RECEIVER_KEYWORDS + AMOUNT_KEYWORDS
    + MEMO_KEYWORDS + FEE_KEYWORDS + PROVIDER_INFO_KEYWORDS
)
def _is_reference_line(text):
    return "รหัสอ้างอิง" in text or "เลขที่" in text or "หมายเลข" in text

# ---- month aliases (short, no-dot, full names, common OCR confusion) ----
_MONTH_ALIASES = {}
for _name, _num in THAI_MONTHS.items():
    _MONTH_ALIASES[_name.casefold()] = _num
    _MONTH_ALIASES[_name.replace(".", "").casefold()] = _num
for _name, _num in THAI_MONTHS_FULL.items():
    _MONTH_ALIASES[_name.casefold()] = _num
_MONTH_ALIASES.update({"w.y.": 11, "w.ย.": 11})
_MONTH_RE = "|".join(re.escape(m) for m in sorted(_MONTH_ALIASES, key=len, reverse=True))
_THAI_DATE_RE = re.compile(rf"(?<!\d)(\d{{1,2}})\s*({_MONTH_RE})\.?\s*(\d{{2}}|\d{{4}})(?!\d)", re.I)
_NUMERIC_DATE_RE = re.compile(r"(?<!\d)(\d{1,2})[/-](\d{1,2})[/-](\d{4}|\d{2})(?!\d)")
_TIME_COLON_RE = re.compile(r"(?<![\d:])([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?(?![\d:])")
_TIME_DOT_RE = re.compile(r"(?<![\d.])([01]?\d|2[0-3])\.([0-5]\d)\s*น\.?")

_AMOUNT_NUMBER_RE = re.compile(r"(?<![\w.,/-])(-?\d[\d,]*)(?:\.(\d{1,2}))?(?![\d.,/-]|[A-Za-z])")
_AMOUNT_EXCLUDED_RE = re.compile(r"ค่าธรรมเนียม|ภาษี|VAT|SERVICE\s*CHARGE|ส่วนลด|DISCOUNT|เงินทอน|CHANGE|เงินสด|CASH|SUBTOTAL|SUB\s*TOTAL|BEFORE\s+TAX", re.I)
_AMOUNT_GROUPS = (
    (r"จำนวนเงินที่ชำระ", r"ยอดชำระจริง", r"AMOUNT\s+DUE", r"TOTAL\s+DUE", r"ยอดชำระสุทธิ", r"ยอดสุทธิ", r"ยอดชำระรวม", r"สุทธิ", r"NET\s+TOTAL", r"NET\s+BAHT", r"GRAND\s+TOTAL", r"ยอดจ่ายจริง", r"จำนวนเงินที่ต้องชำระ", r"รวมเงินที่ต้องชำระทั้งสิ้น", r"รวมเงินที่ต้องชำระ", r"ยอดเงินที่ต้องชำระ"),
    (r"จำนวนเงินที่เต็ม", r"จำนวนเงินที่เติม", r"จำนวนเงิน", r"ยอดโอน", r"เงินที่โอน", r"TRANSFER\s+AMOUNT", r"TOTAL\s+AMOUNT", r"ยอดชำระ", r"ยอดเงิน", r"AMOUNT", r"จำนวน(?=\s*[:：])"),
    (r"รวมทั้งสิ้น", r"รวมเงิน", r"ยอดรวม", r"TOTAL", r"TOTAL\s+BAHT", r"ยอดรวมสุทธิ"),
)


def normalize_text(value):
    text = unicodedata.normalize("NFC", str(value or ""))
    for char in "\u200b\u200c\u200d\u200e\u200f\u2060\ufeff":
        text = text.replace(char, "")
    text = text.replace("\xa0", " ")
    text = text.translate(str.maketrans("๐๑๒๓๔๕๖๗๘๙：", "0123456789:"))

    corrections = {
        "อำนวนเงิน": "จำนวนเงิน",
        "จานวนเงิน": "จำนวนเงิน",
        "คำธรรมเนียม": "ค่าธรรมเนียม",
        "คำรรรมเนียม": "ค่าธรรมเนียม",
        "คาธรรมเนียม": "ค่าธรรมเนียม",
    }
    for wrong, correct in corrections.items():
        if text.startswith(wrong):
            text = correct + text[len(wrong):]
            break
    if text.startswith("บันทึกช่วยจา") and not text.startswith("บันทึกช่วยจาำ"):
        text = "บันทึกช่วยจำ" + text[len("บันทึกช่วยจา"):]
    return re.sub(r"[ \t]+", " ", text).strip()


def is_thai_text(value):
    if not value:
        return False
    for char in str(value):
        if "ก" <= char <= "๙":
            return True
    return False


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
            for part in _expand_text(text):
                part = normalize_text(part)
                if part:
                    lines.append({"text": part, "confidence": score})
    return lines


@lru_cache(maxsize=None)
def _label_pattern_cached(keywords):
    sorted_keywords = sorted(keywords, key=len, reverse=True)
    return "|".join(rf"(?<![A-Za-z])(?:{keyword})(?![A-Za-z])" for keyword in sorted_keywords)


def _label_pattern(keywords):
    return _label_pattern_cached(tuple(keywords))


@lru_cache(maxsize=None)
def _other_label_re(strict):
    # strict=True: a label only counts when it stands alone as a word (followed by
    # whitespace, ":" or end of text). This stops real names that merely *start*
    # with label letters (e.g. "สุทธิพงษ์", "ถึงพร") from being treated as labels.
    tail = r"(?=\s|[:：]|$)" if strict else r"\s*[:：]?"
    return re.compile(rf"^\s*(?:{_label_pattern(_ALL_LABEL_KEYWORDS)}){tail}", re.IGNORECASE)


def _is_other_label(text, strict=False):
    return _other_label_re(bool(strict)).match(text) is not None


def is_valid_name(text):
    if not isinstance(text, str) or not text.strip():
        return False
    text = text.strip()
    if (
        text in IGNORE_TEXT
        or text in BANK_NAMES
        or re.search(r"\d", text)
        or _is_other_label(text, strict=True)
        or re.search(r"สำเร็จ|รหัสอ้างอิง|เลขที่|หมายเลข|ตรวจสอบ|สแกน|^ธนาคาร|^ธ\.", text)
    ):
        return False
    has_letters = re.search(r"[ก-๙a-zA-Z]", text)
    valid_characters = re.fullmatch(r"[ก-๙a-zA-Z\s.\-*,&()]+", text)
    return bool(has_letters and valid_characters)


def find_person_near_label(lines, keywords):
    pattern = _label_pattern(keywords)
    label_re = re.compile(rf"^\s*(?:{pattern})\s*[:：]?\s*(.*?)\s*$", re.IGNORECASE)
    for index, item in enumerate(lines):
        text = str(item.get("text") or "").strip()
        match = label_re.match(text)
        if not match:
            continue
        inline = match.group(1).strip()
        if is_valid_name(inline):
            return inline
        for next_index in range(index + 1, min(index + 3, len(lines))):
            candidate = str(lines[next_index].get("text") or "").strip()
            if _is_other_label(candidate, strict=True):
                break
            if is_valid_name(candidate):
                return candidate
        # Continue to another explicit label if present.
    return None


def find_people_by_order(lines):
    """Fallback: take the first two name-like lines when labels are missing."""
    ignored = ["จ่ายบิลสำเร็จ", "โอนเงินสำเร็จ", "เติมเงินสำเร็จ", "ผู้รับเงินสามารถสแกน", "เพื่อตรวจสอบสถานะ", "ข้อมูลเพิ่มเติม", "จำนวนเงิน", "บันทึกช่วยจำ", "ค่าธรรมเนียม"]
    candidates = []
    for item in lines:
        text = str(item.get("text") or "").strip()
        if any(phrase.casefold() in text.casefold() for phrase in ignored):
            continue
        if is_valid_name(text):
            candidates.append(text)
    if len(candidates) >= 2:
        return candidates[0], candidates[1]
    return None, None


def _normalize_year(year, current_year):
    """Return a CE year, or None if the value is ambiguous/out of range."""
    if year < 100:
        # Modern slips: 00–49 = CE, 60–99 = BE; ambiguous 50–59 rejected.
        if year <= 49:
            year += 2000
        elif year >= 60:
            year += 2500
        else:
            return None
    if year >= 2400:
        year -= 543
    if not 1900 <= year <= current_year + 1:
        return None
    return year


def parse_date(lines, today=None):
    """Parse explicit dates; ambiguous OCR month tokens remain unresolved."""
    current_year = (today or datetime.now()).year
    for item in lines:
        text = item["text"]
        if _is_reference_line(text):
            continue
        match = _THAI_DATE_RE.search(text)
        if match:
            day, year = int(match[1]), int(match[3])
            month = _MONTH_ALIASES.get(match[2].casefold())
            if month is None:
                continue
        else:
            match = _NUMERIC_DATE_RE.search(text)
            if not match:
                continue
            day, month, year = map(int, match.groups())
            if month > 12 and day <= 12:
                day, month = month, day
        year = _normalize_year(year, current_year)
        if year is None:
            continue
        try:
            return datetime(year, month, day).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _match_time(text):
    match = _TIME_COLON_RE.search(text) or _TIME_DOT_RE.search(text)
    if match:
        return f"{int(match.group(1)):02d}:{int(match.group(2)):02d}"
    return None


def parse_time(lines):
    """Prefer a time on the same line as the date; otherwise the first time found."""
    for item in lines:
        text = str(item.get("text") or "")
        if (_THAI_DATE_RE.search(text) or _NUMERIC_DATE_RE.search(text)) and not _is_reference_line(text):
            found = _match_time(text)
            if found:
                return found
    for item in lines:
        if _is_reference_line(item["text"]):
            continue
        found = _match_time(str(item.get("text") or ""))
        if found:
            return found
    return None


def _extract_amount_candidates(candidate):
    matches = []
    for m in _AMOUNT_NUMBER_RE.finditer(candidate):
        whole, fractional = m.groups()
        digits = whole.lstrip("-")
        # Ignore long IDs.
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
    return matches


def parse_amount(lines):
    """Extract a labeled payment amount, prioritizing net paid over subtotals.

    Never use arbitrary account numbers, dates, item prices or reference IDs.
    """
    for group in _AMOUNT_GROUPS:
        values = set()
        label_re = re.compile(rf"^\s*(?:{_label_pattern(group)})\s*[:：]?\s*(.*)$", re.I)
        for i, item in enumerate(lines):
            text = str(item.get("text") or "").strip()
            if _AMOUNT_EXCLUDED_RE.search(text):
                continue
            found = label_re.match(text)
            if not found:
                continue
            if re.search(r"จำนวนสินค้า|จำนวนหน่วย|TOTAL\s+(?:ITEMS?|QTY)|รวมจำนวน", text, re.I):
                continue
            candidates = [found.group(1).strip()]
            if i + 1 < len(lines):
                nxt = str(lines[i + 1].get("text") or "").strip()
                if not _is_other_label(nxt) and not _AMOUNT_EXCLUDED_RE.search(nxt) and not _is_reference_line(nxt) and not _THAI_DATE_RE.search(nxt) and not _NUMERIC_DATE_RE.search(nxt) and not _match_time(nxt):
                    candidates.append(nxt)
            for candidate in candidates:
                if _is_reference_line(candidate) or _THAI_DATE_RE.search(candidate) or _NUMERIC_DATE_RE.search(candidate) or _match_time(candidate):
                    continue
                matches = _extract_amount_candidates(candidate)
                if matches:
                    # If OCR combines a quantity and a price on one line,
                    # the decimal-formatted amount is more reliable.
                    matches.sort(key=lambda x: (not x[0], x[1]))
                    values.add(f"{matches[0][2]:.2f}")
                    break
        if values:
            if len(values) == 1:
                return next(iter(values))
            return None
    return None


def find_labeled_value(lines, label_pattern):
    label_re = re.compile(rf"^\s*(?:{label_pattern})\s*[:：]?\s*(.*?)\s*$", re.IGNORECASE)
    for index, item in enumerate(lines):
        text = str(item.get("text") or "").strip()
        match = label_re.match(text)
        if not match:
            continue
        value = match.group(1).strip()
        if value:
            if _is_other_label(value):
                return None
            return value
        if index + 1 < len(lines):
            next_value = str(lines[index + 1].get("text") or "").strip()
            if next_value and next_value not in IGNORE_TEXT and not _is_other_label(next_value):
                return next_value
        return None
    return None


def parse_fee(lines):
    pattern = re.compile(_label_pattern(FEE_KEYWORDS), re.I)
    for i, item in enumerate(lines):
        text = item["text"]
        if not pattern.search(text):
            continue
        candidates = [text]
        for j in range(i + 1, min(i + 4, len(lines))):
            nxt = lines[j]["text"]
            if nxt == "วันที่ทำรายการ":
                continue
            if _is_other_label(nxt) or _is_reference_line(nxt) or _match_time(nxt):
                break
            if re.fullmatch(r"\d[\d,]*\.\d{2}(?:\s+[^\d]+)?", nxt):
                candidates.append(nxt)
            break
        for candidate in candidates:
            match = re.search(r"(?<![\d.,-])\d[\d,]*\.\d{2}(?!\d)", candidate)
            if match:
                return match.group() + " บาท"
    return None


def parse_notes(lines):
    return {
        "memo": find_labeled_value(lines, "|".join(MEMO_KEYWORDS)),
        "fee": parse_fee(lines),
        "provider_info": find_labeled_value(lines, "|".join(PROVIDER_INFO_KEYWORDS)),
    }


def detect_receipt_item(lines):
    """Use a conservative generic label for known receipt types."""
    text = " ".join(str(item.get("text") or "") for item in lines).casefold()
    if "cafe amazon" in text or "café amazon" in text or "คาเฟ่อเมซอน" in text:
        return "ซื้อเครื่องดื่ม"
    if "7-eleven" in text or "cp all" in text:
        return "ซื้อสินค้าที่ 7-Eleven"
    if "การไฟฟ้า" in text or "ค่าไฟฟ้า" in text:
        return "ค่าไฟฟ้า"
    if "การประปา" in text or "ค่าน้ำประปา" in text:
        return "ค่าน้ำประปา"
    if "payment to shopee" in text:
        return "ชำระเงิน Shopee"
    return None


class _TableText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
    def handle_data(self, data):
        self.parts.append(data)
    def handle_starttag(self, tag, attrs):
        if tag in {"tr", "br", "p"}:
            self.parts.append("\n")
    def handle_endtag(self, tag):
        if tag in {"td", "th"}:
            self.parts.append(" ")
        elif tag in {"tr", "p"}:
            self.parts.append("\n")


def _expand_text(text):
    if re.search(r"<(?:table|tr|td|th)\b", text, re.I):
        parser = _TableText()
        parser.feed(text)
        parser.close()
        return "".join(parser.parts).splitlines()
    return text.splitlines()


def detect_document_type(lines):
    text = " ".join(item["text"] for item in lines).casefold()
    if "ถอนสลาก" in text or "ถอนเงินสำเร็จ" in text:
        return "withdrawal"
    elif any(word in text for word in ("เติมเงิน", "หมายเลขบัตรแรบบิท", "หมายเลขแรบบิทการ์ด")):
        return "topup"
    elif any(word in text for word in ("จ่ายบิล", "ชำระบิล", "payment to")):
        return "bill"
    elif "โอนเงินสำเร็จ" in text or "transfer successful" in text:
        return "transfer"
    elif any(word in text for word in ("ใบเสร็จ", "ใบกำกับภาษี", "receipt", "restaurant", "ค่าสินค้า", "เงินทอน", "cashier", "pizza")):
        return "receipt"
    else:
        return "unknown"


def _reference_date(lines):
    # Only use an explicit date-shaped reference prefix corroborated by day/year.
    text = " ".join(x["text"] for x in lines)
    if not any(word in text.casefold() for word in ("scb", "ไทยพาณิชย์", "krungthai", "กรุงไทย", "แรบบิท", "กรุงเทพ")):
        return None
    refs = set()
    for x in lines:
        m = re.search(r"(?:รหัสอ้างอิง|หมายเลขอ้างอิง)\s*[:：]?\s*(?:C|0000)?(20\d{6})", x["text"], re.I)
        if m:
            refs.add(m[1])
    if len(refs) != 1:
        return None
    try:
        d = datetime.strptime(refs.pop(), "%Y%m%d")
    except ValueError:
        return None
    for x in lines:
        m = re.search(r"(?<!\d)(\d{1,2})\s*\.?\s*([^\d\s]{1,12})\s*(25\d{2}|20\d{2})(?!\d)", x["text"])
        if m and _match_time(x["text"]) and int(m[1]) == d.day and _normalize_year(int(m[3]), datetime.now().year) == d.year:
            return d.strftime("%Y-%m-%d")
    return None


def _item_v3(lines, kind):
    text = " ".join(x["text"] for x in lines).casefold()
    if re.search(r"rabbit|แรบบิท|บางกอก\s*สมาร์ทการ์ด", text):
        return "เติมเงินบัตร Rabbit"
    if "ถอนสลาก" in text:
        return "ถอนสลากดิจิทัล"
    known = detect_receipt_item(lines)
    if known:
        return known
    if any(word in text for word in ("pizza", "restaurant", "ร้านอาหาร", "อาหาร ของหวาน เครื่องดื่ม")):
        return "ซื้ออาหาร"
    if kind == "topup":
        return "เติมเงิน"
    if kind == "transfer":
        return "โอนเงิน"
    if kind == "bill":
        return "ชำระบิล"
    return None


def parse_slip(raw_pages):
    lines = get_ocr_texts(raw_pages)
    kind = detect_document_type(lines)
    date = parse_date(lines)
    reasons = []
    if not date:
        date = _reference_date(lines)
        if date:
            reasons.append("date_inferred_from_reference")
    time = parse_time(lines)
    amount = parse_amount(lines)
    if kind == "receipt":
        sender = None
        receiver = None
    else:
        sender = find_person_near_label(lines, SENDER_KEYWORDS)
        receiver = find_person_near_label(lines, RECEIVER_KEYWORDS)
    item = _item_v3(lines, kind)
    if not date:
        reasons.append("missing_date")
    if amount is None:
        reasons.append("missing_amount")
    if not time:
        reasons.append("missing_time")
    if not item:
        reasons.append("missing_item_name")
    return {
        "date": date, "time": time, "sender": sender, "receiver": receiver,
        "amount": amount, "item_name": item, "note": parse_notes(lines),
        "needs_review": bool(reasons), "review_reasons": reasons,
        "document_type": kind,
        "category_hint": "อื่นๆ" if not item else None,
        "ocr_text": [x["text"] for x in lines],
    }
