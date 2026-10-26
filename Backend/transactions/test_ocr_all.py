"""
Manual smoke-test helper for local OCR sample images.

Run from the Backend directory:
    python -m transactions.test_ocr_all

Uses Backend/transactions/scb.jpg by default.
This module is for local diagnosis only; it is not imported by Django views.
"""
from pathlib import Path

from transactions.ocr import read_receipt, get_receipt_amount, extract_datetime

BASE_DIR = Path(__file__).resolve().parent
SAMPLE_IMAGES = [BASE_DIR / "scb.jpg"]


def main():
    for image_path in SAMPLE_IMAGES:
        print(f"\n========== {image_path.name} ==========")
        if not image_path.is_file():
            print("ไม่พบไฟล์:", image_path)
            continue

        try:
            text = read_receipt(image_path)
            amount, amount_status = get_receipt_amount(text)
            print("ยอดเงิน:", amount)
            print("สถานะ:", amount_status)
            print("วันที่และเวลา:", extract_datetime(text))
            print("ข้อความ OCR:")
            print(text)
        except Exception as exc:
            print(f"เกิดข้อผิดพลาด: {type(exc).__name__}: {exc}")


if __name__ == "__main__":
    main()
