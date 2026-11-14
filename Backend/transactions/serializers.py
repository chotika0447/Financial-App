import logging

from django.core.files.storage import default_storage
from rest_framework import serializers

from line_bot.supabase_storage import (
    delete_receipt,
    get_receipt_signed_url,
    upload_receipt,
)

from .models import Transaction

logger = logging.getLogger(__name__)
NEW_PREFIX = "receipts/transactions/"


class TransactionSerializer(serializers.ModelSerializer):

    name = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
        max_length=200
    )

    receipt = serializers.ImageField(required=False, allow_null=False, use_url=False)

    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    receipt_url = serializers.SerializerMethodField()

    def get_receipt_url(self, obj):
        if not obj.receipt:
            return None
        path = obj.receipt.name
        # รองรับไฟล์ใหม่และไฟล์เก่าที่เก็บบน Supabase
        old_receipt = False
        if path.startswith("receipts/"):
            filename = path[len("receipts/"):]
            name, dot, extension = filename.rpartition(".")
            hex_digits = "0123456789abcdefABCDEF"

            if dot and extension.lower() in ("jpg", "jpeg", "png"):
                if len(name) == 32 and all(char in hex_digits for char in name):
                    old_receipt = True

        if path.startswith(NEW_PREFIX) or old_receipt:
            return get_receipt_signed_url(path)
        # Legacy local files: retain existing file and return its local URL.
        # Render must actually serve the old file for this URL to work.
        try:
            return default_storage.url(path)
        except Exception:
            return None

    def _upload_new_receipt(self, image):
        image.seek(0)
        return upload_receipt(
            image.read(), filename=image.name, folder="receipts/transactions"
        )

    def _save_with_receipt(self, validated_data, save_function):
        image = validated_data.pop("receipt", None)
        if image is None:
            return save_function(validated_data)

        path = self._upload_new_receipt(image)
        validated_data["receipt"] = path

        try:
            return save_function(validated_data)
        except Exception:
            try:
                delete_receipt(path)
            except Exception:
                logger.exception("Failed to clean up uploaded receipt")
            raise

    def create(self, validated_data):
        return self._save_with_receipt(validated_data, super().create)

    def update(self, instance, validated_data):
        def save_update(data):
            return super(TransactionSerializer, self).update(instance, data)

        return self._save_with_receipt(validated_data, save_update)

    class Meta:
        model = Transaction

        fields = [
            "id",
            "amount",
            "transaction_type",
            "name",
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

    def validate(self, attrs):
        attrs = super().validate(attrs)

        transaction_type = attrs.get(
            "transaction_type",
            getattr(self.instance, "transaction_type", None)
        )
        category = attrs.get(
            "category",
            getattr(self.instance, "category", None)
        )

        if category is not None:
            if category.user_id is not None:
                raise serializers.ValidationError({
                    "category": "กรุณาเลือกหมวดหมู่ที่ระบบกำหนดไว้"
                })

            if category.transaction_type != transaction_type:
                raise serializers.ValidationError({
                    "category": "หมวดหมู่ไม่ตรงกับประเภทรายรับหรือรายจ่าย"
                })

        return attrs

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError(
                "กรุณาระบุชื่อรายการ"
            )

        return value.strip()

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