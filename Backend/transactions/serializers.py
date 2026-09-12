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
            'user',
            'category_id',
            'transaction_time',
            'receipt',
        ]
        read_only_fields = ['id', 'user', 'created_at']  # เอา transaction_date ออก เพื่อให้รับค่าได้