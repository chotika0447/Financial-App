import os
from uuid import uuid4

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()


def upload_receipt(image_bytes, filename="receipt.jpg"):
    """อัปโหลดรูปใบเสร็จไปยัง Supabase Storage"""

    client = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SECRET_KEY"]
    )

    bucket = os.environ["SUPABASE_RECEIPTS_BUCKET"]

    extension = os.path.splitext(filename)[1].lower()

    if extension not in (".jpg", ".jpeg", ".png"):
        raise ValueError("รองรับเฉพาะไฟล์ JPG และ PNG")

    path = f"receipts/{uuid4().hex}{extension}"

    content_type = (
        "image/png" if extension == ".png" else "image/jpeg"
    )

    client.storage.from_(bucket).upload(
        path=path,
        file=image_bytes,
        file_options={"content-type": content_type}
    )

    return path

def get_receipt_signed_url(path):
    if not path or not path.startswith("receipts/"):
        return None

    try:
        client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SECRET_KEY"]
        )

        bucket = os.environ["SUPABASE_RECEIPTS_BUCKET"]

        result = client.storage.from_(bucket).create_signed_url(
            path,
            3600
        )

        return result["signedURL"]

    except Exception as error:
        print(f"Cannot create receipt signed URL: {error}")
        return None