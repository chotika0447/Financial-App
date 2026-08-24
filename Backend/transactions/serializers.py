from rest_framework import serializers
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Transaction
        fields = [
            'id',
            'amount',
            'transaction_type',
            'description',
            'transaction_date',
            'created_at',
        ]

    """
    validate_<ชื่อ field อะไรก็ได้ใน Serializer ที่ต้องการตรวจสอบ>
    - เป็นConvention ของ Django REST Framework
    - ตรวจสอบได้แค่ field เดียว
    """
    def validate_amount(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                'Amount must be greater than 0.'
            )

        return value
    
    """
        validate()
        - ตรวจสอบได้หลาย field พร้อมกัน
    """
    def validate(self, data):

        amount = data.get('amount')
        transaction_type = data.get('transaction_type')

        if amount is not None and amount <= 0:
            raise serializers.ValidationError(
                'Amount must be greater than 0.'
            )

        if transaction_type not in ['income', 'expense']:
            raise serializers.ValidationError(
                'Invalid transaction type.'
            )

        return data
