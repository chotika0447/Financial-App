from line_bot.supabase_storage import get_receipt_signed_url
from rest_framework import serializers

from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):

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

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "ต้องมากกว่า 0."
            )

        return value

    def validate_transaction_type(self, value):
        if value not in ["income", "expense"]:
            raise serializers.ValidationError(
                "โปรดเลือก รายรับ หรือ รายจ่าย เท่านั้น."
            )

        return value

    def validate_receipt(self, value):
        if not value:
            return value

        max_size = 5 * 1024 * 1024

        if value.size > max_size:
            raise serializers.ValidationError(
                "ขนาดรูปที่อัพโหลดต้องไม่เกิน 5 MB."
            )

        allowed_content_types = [
            "image/jpeg",
            "image/png",
        ]

        content_type = getattr(
            value,
            "content_type",
            None
        )

        if content_type not in allowed_content_types:
            raise serializers.ValidationError(
                "รูปแบบไฟล์ที่อนุญาตคือ JPEG และ PNG เท่านั้น."
            )

        return value