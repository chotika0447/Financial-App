from rest_framework import serializers
from users.models import User
from .models import Debts, Payments


class DebtSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(
        read_only=True
    )

    counterparty = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Debts
        fields = [
            'debt_id',
            'debt_name',
            'user',
            'counterparty',
            'counterparty_name',
            'debt_type',
            'total_amount',
            'remaining_amount',
            'payment_type',
            'payment_amount',
            'due_date',
            'payment_day',
            'status',
            'note',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'debt_id',
            'user',
            'remaining_amount',
            'status',
            'created_at',
            'updated_at',
        ]
    #ตรวจความถูกต้องของข้อมูล
    def validate(self, data):
        total_amount = data.get(
            'total_amount',
            getattr(self.instance, 'total_amount', None)
        )

        payment_type = data.get(
            'payment_type',
            getattr(self.instance, 'payment_type', None)
        )

        payment_amount = data.get(
            'payment_amount',
            getattr(self.instance, 'payment_amount', None)
        )

        payment_day = data.get(
            'payment_day',
            getattr(self.instance, 'payment_day', None)
        )

        # จำนวนหนี้ต้องมากกว่า 0
        if total_amount is not None and total_amount <= 0:
            raise serializers.ValidationError({
                'total_amount': 'จำนวนหนี้ต้องมากกว่า 0'
            })

        # flexible ไม่ควรมี payment_amount/payment_day
        if payment_type == 'flexible':
            if payment_amount is not None:
                raise serializers.ValidationError({
                    'payment_amount': 'หนี้แบบทยอยชำระไม่ควรกำหนดจำนวนเงินรายเดือน'
                })

            if payment_day is not None:
                raise serializers.ValidationError({
                    'payment_day': 'หนี้แบบทยอยชำระไม่ควรกำหนดวันชำระรายเดือน'
                })

        # monthly ต้องมี payment_amount และ payment_day
        if payment_type == 'monthly':
            if payment_amount is None:
                raise serializers.ValidationError({
                    'payment_amount': 'หนี้แบบรายเดือนต้องระบุจำนวนเงินต่อเดือน'
                })

            if payment_amount <= 0:
                raise serializers.ValidationError({
                    'payment_amount': 'จำนวนเงินต่อเดือนต้องมากกว่า 0'
                })

            if payment_day is None:
                raise serializers.ValidationError({
                    'payment_day': 'หนี้แบบรายเดือนต้องระบุวันชำระ'
                })

            if not 1 <= payment_day <= 31:
                raise serializers.ValidationError({
                    'payment_day': 'วันชำระต้องอยู่ระหว่าง 1-31'
                })

        return data

    def create(self, validated_data):
        total_amount = validated_data['total_amount']

        debt = Debts.objects.create(
            **validated_data,
            remaining_amount=total_amount,
            status='ongoing'
        )

        return debt


class PaymentSerializer(serializers.ModelSerializer):
    debt = serializers.PrimaryKeyRelatedField(
        read_only=True
    )

    class Meta:
        model = Payments
        fields = [
            'id',
            'debt',
            'scheduled_amount',
            'paid_amount',
            'due_date',
            'payment_date',
            'proof_image',
            'note',
            'payment_status',
            'confirm_status',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'debt',
            'payment_status',
            'confirm_status',
            'created_at',
            'updated_at',
        ]

    #ตรวจความถูกต้องของข้อมูล
    def validate(self, data):

        paid_amount = data.get('paid_amount', 0)

        if paid_amount < 0:
            raise serializers.ValidationError({
                'paid_amount': 'จำนวนเงินที่จ่ายต้องไม่ติดลบ'
            })

        scheduled_amount = data.get('scheduled_amount')

        if (
            scheduled_amount is not None
            and scheduled_amount <= 0
        ):
            raise serializers.ValidationError({
                'scheduled_amount': 'จำนวนเงินที่ต้องชำระต้องมากกว่า 0'
            })

        return data

