from line_bot.supabase_storage import get_receipt_signed_url
from rest_framework import serializers

from .models import Transaction, TransactionDraft


# ข้อมูลรายรับ-รายจ่ายที่บันทึกแล้ว
class TransactionSerializer(serializers.ModelSerializer):

    # ส่งชื่อหมวดหมู่ให้ Frontend
    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )
    receipt_url = serializers.SerializerMethodField()

    def get_receipt_url(self, obj):
        if not obj.receipt:
            return None
        path = obj.receipt.name
        if path.startswith("receipts/"):
            return get_receipt_signed_url(path)
        return None

    class Meta:
        model = Transaction

        fields = [
            "id",
            "amount",
            "transaction_type",
            "item_name",
            "description",
            "transaction_date",
            "category",
            "category_name",
            "sub_category",
            "account",
            "transaction_time",
            "receipt",
            "receipt_url",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "created_at"
        ]

    # ตรวจสอบจำนวนเงิน
    def validate_amount(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Amount must be greater than 0."
            )

        return value

    # ตรวจสอบประเภทรายการ
    def validate_transaction_type(self, value):

        if value not in ["income", "expense"]:
            raise serializers.ValidationError(
                "Choose income or expense."
            )

        return value

    # ตรวจสอบรูปใบเสร็จ
    def validate_receipt(self, value):

        if not value:
            return value

        # รูปต้องไม่เกิน 5 MB
        max_size = 5 * 1024 * 1024

        if value.size > max_size:
            raise serializers.ValidationError(
                "Receipt image must not exceed 5 MB."
            )

        # รองรับ JPG, PNG และ WEBP
        allowed_content_types = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ]

        content_type = getattr(
            value,
            "content_type",
            None
        )

        if content_type not in allowed_content_types:
            raise serializers.ValidationError(
                "Receipt must be a JPG, PNG, or WEBP image."
            )

        return value


# ข้อมูลรายการร่างที่ยังไม่ได้ยืนยัน
class TransactionDraftSerializer(serializers.ModelSerializer):

    # ส่งชื่อหมวดหมู่ให้ Frontend
    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    receipt_url = serializers.SerializerMethodField()

    def get_receipt_url(self, obj):
        if not obj.receipt:
            return None
        path = obj.receipt.name
        if path.startswith("receipts/"):
            return get_receipt_signed_url(path)
        return None

    class Meta:
        model = TransactionDraft

        fields = [
            "id",
            "amount",
            "transaction_type",
            "item_name",
            "description",
            "category",
            "category_name",
            "sub_category",
            "account",
            "transaction_date",
            "transaction_time",
            "receipt",
            "receipt_url",
            "status",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "status",
            "created_at",
        ]

    # ตรวจสอบจำนวนเงินของรายการร่าง
    def validate_amount(self, value):

        # Draft อาจยังไม่มีจำนวนเงิน หาก OCR อ่านไม่พบ
        if value is not None and value <= 0:
            raise serializers.ValidationError(
                "จำนวนเงินต้องมากกว่า 0 บาท"
            )

        return value

    # ตรวจสอบประเภทรายการ
    def validate_transaction_type(self, value):

        # Draft อาจยังไม่ได้เลือกประเภท
        if value not in ["income", "expense", ""]:
            raise serializers.ValidationError(
                "กรุณาเลือกประเภทรายรับหรือรายจ่าย"
            )

        return value

    # ตรวจสอบรูปหลักฐาน
    def validate_receipt(self, value):

        if not value:
            return value

        max_size = 5 * 1024 * 1024

        if value.size > max_size:
            raise serializers.ValidationError(
                "รูปหลักฐานต้องมีขนาดไม่เกิน 5 MB"
            )

        allowed_content_types = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ]

        content_type = getattr(
            value,
            "content_type",
            None
        )

        if content_type not in allowed_content_types:
            raise serializers.ValidationError(
                "รองรับเฉพาะรูป JPG, PNG และ WEBP"
            )

        return value
