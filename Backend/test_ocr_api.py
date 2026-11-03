from transactions.ocr_api import run_ocr
from transactions.slip_parser import parse_slip
import json

image_path = "test_slip.jpg"

raw_pages = run_ocr(image_path)

print("\n========== RAW OCR ==========")
print(json.dumps(raw_pages, ensure_ascii=False, indent=2))

parsed = parse_slip(raw_pages)

print("\n========== PARSED SLIP ==========")
print(json.dumps(parsed, ensure_ascii=False, indent=2))