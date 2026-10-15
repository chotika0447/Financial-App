from rest_framework import serializers

from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):

    # เอาชื่อ Category ส่งให้ Frontend ด้วย
    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )


    class Meta:

        model = Transaction

        fields = [
            "id",
            "amount",
            "transaction_type",
            "description",
            "transaction_date",

            "category",
            "category_name",
            "sub_category",
            "account",

            "transaction_time",
            "receipt",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "created_at"
        ]


    # ตรวจจำนวนเงิน
    def validate_amount(self, value):

        if value <= 0:

            raise serializers.ValidationError(
                "Amount must be greater than 0."
            )

        return value


    # ตรวจ transaction_type
    def validate_transaction_type(self, value):

        if value not in ["income", "expense"]:

            raise serializers.ValidationError(
                "Choose income or expense."
            )

        return value


    # ตรวจรูปใบเสร็จ
    def validate_receipt(self, value):

        if not value:
            return value

        # จำกัดขนาดรูปไม่เกิน 5 MB
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