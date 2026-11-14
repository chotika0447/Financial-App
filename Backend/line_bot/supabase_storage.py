import logging
import os
from uuid import uuid4

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

logger = logging.getLogger(__name__)


def get_supabase_client():
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SECRET_KEY"]
    )


def upload_receipt(image_bytes, filename="receipt.jpg", folder="receipts"):
    """อัปโหลดรูปใบเสร็จไปยัง Supabase Storage"""

    extension = os.path.splitext(filename)[1].lower()

    if extension not in (".jpg", ".jpeg", ".png"):
        raise ValueError("รองรับเฉพาะไฟล์ JPG และ PNG")

    if folder not in ("receipts", "receipts/transactions"):
        raise ValueError("ไม่อนุญาตให้ใช้โฟลเดอร์นี้")

    path = f"{folder}/{uuid4().hex}{extension}"

    content_type = (
        "image/png" if extension == ".png" else "image/jpeg"
    )

    client = get_supabase_client()
    bucket = os.environ["SUPABASE_RECEIPTS_BUCKET"]

    client.storage.from_(bucket).upload(
        path=path,
        file=image_bytes,
        file_options={"content-type": content_type}
    )

    return path


def get_receipt_signed_url(path):
    """สร้าง Signed URL สำหรับอ่านรูปใบเสร็จ"""

    if not path or not path.startswith("receipts/"):
        return None

    try:
        client = get_supabase_client()
        bucket = os.environ["SUPABASE_RECEIPTS_BUCKET"]

        result = client.storage.from_(bucket).create_signed_url(
            path, 3600
        )

        return result.get("signedURL") or result.get("signedUrl")

    except Exception as exc:
        logger.warning(
            "Cannot generate receipt URL for %s: %s",
            path,
            exc
        )
        return None


def delete_receipt(path):
    """ลบรูปออกจาก Supabase Storage"""

    if not path or not path.startswith("receipts/"):
        return

    client = get_supabase_client()
    bucket = os.environ["SUPABASE_RECEIPTS_BUCKET"]

    client.storage.from_(bucket).remove([path])
