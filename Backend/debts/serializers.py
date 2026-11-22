from rest_framework import serializers
from users.models import User
from .models import Debts, Payments
from django.db.models import Sum, Q
from django.utils import timezone
from .debt_schedule import initial_monthly_due_date, last_installment_due_date


class DebtSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    paired_debt = serializers.PrimaryKeyRelatedField(read_only=True)
    counterparty = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)
    confirmed_amount = serializers.SerializerMethodField()
    pending_amount = serializers.SerializerMethodField()
    submitted_amount = serializers.SerializerMethodField()

    class Meta:
        model = Debts
        fields = [
            'id', 'name', 'user', 'counterparty', 'counterparty_name', 'paired_debt',
            'type', 'total_amount', 'remaining_amount', 'confirmed_amount',
            'pending_amount', 'submitted_amount', 'payment_amount', 'due_date',
            'payment_date', 'current_due_date', 'reminder_enabled',
            'reminder_days_before', 'reminder_time', 'reminder_repeat', 'status',
            'note', 'icon', 'color', 'image', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'user', 'remaining_amount', 'confirmed_amount', 'pending_amount',
            'submitted_amount', 'created_at', 'updated_at', 'current_due_date',
        ]

    def get_payment_totals(self, obj):
        if hasattr(obj, '_payment_totals_cache'):
            return obj._payment_totals_cache
        debt_ids = [obj.pk]
        if obj.paired_debt_id:
            debt_ids.append(obj.paired_debt_id)
        totals = Payments.objects.filter(
            debt_id__in=debt_ids,
            approvement_status__in=['approved', 'pending'],
        ).aggregate(
            confirmed=Sum('paid_amount', filter=Q(approvement_status='approved')),
            pending=Sum('paid_amount', filter=Q(approvement_status='pending')),
        )
        confirmed = totals['confirmed'] or 0
        pending = totals['pending'] or 0
        obj._payment_totals_cache = {
            'confirmed': confirmed, 'pending': pending,
            'submitted': confirmed + pending,
        }
        return obj._payment_totals_cache

    def get_confirmed_amount(self, obj):
        return self.get_payment_totals(obj)['confirmed']

    def get_pending_amount(self, obj):
        return self.get_payment_totals(obj)['pending']

    def get_submitted_amount(self, obj):
        return self.get_payment_totals(obj)['submitted']

    def validate(self, data):
        total_amount = data.get('total_amount', getattr(self.instance, 'total_amount', None))
        payment_amount = data.get('payment_amount', getattr(self.instance, 'payment_amount', None))
        payment_date = data.get('payment_date', getattr(self.instance, 'payment_date', None))
        due_date = data.get('due_date', getattr(self.instance, 'due_date', None))

        if total_amount is None or total_amount <= 0:
            raise serializers.ValidationError({'total_amount': 'จำนวนหนี้ต้องมากกว่า 0'})
        if payment_amount is None or payment_amount <= 0:
            raise serializers.ValidationError({'payment_amount': 'จำนวนเงินต่อเดือนต้องมากกว่า 0'})
        if payment_date is None:
            raise serializers.ValidationError({'payment_date': 'กรุณาระบุวันชำระรายเดือน'})
        if not 1 <= payment_date <= 31:
            raise serializers.ValidationError({'payment_date': 'วันชำระต้องอยู่ระหว่าง 1-31'})
        if due_date is None:
            raise serializers.ValidationError({'due_date': 'กรุณาระบุวันสิ้นสุดการชำระหนี้'})

        schedule_fields = {'total_amount', 'payment_amount', 'payment_date', 'due_date'}
        schedule_changed = self.instance is None or bool(schedule_fields.intersection(data))
        if schedule_changed:
            has_payments = False
            if self.instance is not None:
                ids = [self.instance.pk]
                if self.instance.paired_debt_id:
                    ids.append(self.instance.paired_debt_id)
                has_payments = Payments.objects.filter(debt_id__in=ids).exists()

            if has_payments:
                # Preserve existing installment history. Do not recalculate from original principal.
                current_due = self.instance.current_due_date
                if current_due and due_date < current_due:
                    raise serializers.ValidationError({
                        'due_date': f'วันสิ้นสุดต้องไม่ก่อนงวดปัจจุบัน ({current_due:%d/%m/%Y})'
                    })
            else:
                first_due = initial_monthly_due_date(payment_date, timezone.localdate())
                last_due = last_installment_due_date(first_due, payment_date, total_amount, payment_amount)
                if due_date < last_due:
                    raise serializers.ValidationError({
                        'due_date': (
                            f'วันสิ้นสุดเร็วเกินไป ตามยอดหนี้และยอดผ่อนที่กำหนด '
                            f'ควรสิ้นสุดไม่ก่อนวันที่ {last_due:%d/%m/%Y}'
                        )
                    })
        return data

    def create(self, validated_data):
        total_amount = validated_data['total_amount']
        return Debts.objects.create(**validated_data, remaining_amount=total_amount, status='ongoing')

    def validate_reminder_days_before(self, value):
        if value < 0 or value > 28:
            raise serializers.ValidationError('จำนวนวันแจ้งเตือนต้องอยู่ระหว่าง 0-28 วัน')
        return value


class PaymentSerializer(serializers.ModelSerializer):
    debt = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Payments
        fields = [
            'id', 'debt', 'scheduled_amount', 'paid_amount', 'due_date',
            'paid_date', 'proof_image', 'note', 'payment_status',
            'approvement_status', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'debt', 'approvement_status', 'created_at', 'updated_at',
        ]

    def validate(self, data):
        paid_amount = data.get('paid_amount', 0)
        if paid_amount < 0:
            raise serializers.ValidationError({'paid_amount': 'จำนวนเงินที่จ่ายต้องไม่ติดลบ'})
        scheduled_amount = data.get('scheduled_amount')
        if scheduled_amount is not None and scheduled_amount <= 0:
            raise serializers.ValidationError({'scheduled_amount': 'จำนวนเงินที่ต้องชำระต้องมากกว่า 0'})
        return data
