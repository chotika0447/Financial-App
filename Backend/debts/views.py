from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db import transaction
from django.shortcuts import get_object_or_404 
#ฟังก์ชันของ Django ที่ใช้ตรวจว่าถ้าเจอข้อมูลให้ return obj ถ้าไม่เจอส่ง http 404

from .models import Debts, Payments
from .serializers import DebtSerializer, PaymentSerializer

from decimal import Decimal

#รายการหนี้สิน
class DebtListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    # ดึงรายการหนี้ทั้งหมดของตัวเอง
    def get(self, request):
        debts = Debts.objects.filter(
            user=request.user
        ).order_by('-created_at')

        serializer = DebtSerializer(
            debts,
            many=True
        )

        return Response(serializer.data)

    # สร้างหนี้ใหม่
    def post(self, request):
        serializer = DebtSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        serializer.save(
            user=request.user
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )

#
class DebtDetailView(APIView):
    permission_classes = [IsAuthenticated]

    #ตรวจว่าเป็นหนี้ก้อนไหนและเป็นของuserที่ส่งrequestมาจริงมั้ย
    def get_debt(self, request, debt_id):
        return get_object_or_404(
            Debts,
            debt_id=debt_id,
            user=request.user
        )

    # ดูรายละเอียดหนี้
    def get(self, request, debt_id):
        debt = self.get_debt(
            request,
            debt_id
        )

        serializer = DebtSerializer(debt)

        return Response(serializer.data)

    # แก้ไขหนี้
    def put(self, request, debt_id):
        debt = self.get_debt(
            request,
            debt_id
        )

        serializer = DebtSerializer(
            debt,
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        return Response(serializer.data)

    # ลบหนี้
    def delete(self, request, debt_id):
        debt = self.get_debt(
            request,
            debt_id
        )

        debt.delete()

        return Response(
            {'detail': 'ลบหนี้เรียบร้อยแล้ว'},
            status=status.HTTP_200_OK
        )

#รายการชำระหนี้
class PaymentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_debt(self, request, debt_id):
        return get_object_or_404(
            Debts,
            debt_id=debt_id,
            user=request.user
        )

    # ดูประวัติการชำระของหนี้
    def get(self, request, debt_id):
        debt = self.get_debt(
            request,
            debt_id
        )

        payments = Payments.objects.filter(
            debt=debt
        ).order_by('-due_date', '-created_at')

        serializer = PaymentSerializer(
            payments,
            many=True
        )

        return Response(serializer.data)

    # เพิ่มรายการชำระ
    @transaction.atomic
    def post(self, request, debt_id):
        debt = self.get_debt(
            request,
            debt_id
        )

        serializer = PaymentSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        paid_amount = serializer.validated_data.get(
            'paid_amount',
            Decimal('0.00')
        )

        if paid_amount > debt.remaining_amount:
            return Response(
                {
                    'detail': 'จำนวนเงินที่ชำระเกินยอดหนี้คงเหลือ'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        payment = serializer.save(
            debt=debt
        )

        # คำนวณยอดคงเหลือใหม่
        debt.remaining_amount -= paid_amount

        if debt.remaining_amount <= 0:
            debt.remaining_amount = Decimal('0.00')
            debt.status = 'paid'

        debt.save()

        return Response(
            PaymentSerializer(payment).data,
            status=status.HTTP_201_CREATED
        )


class PaymentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_payment(self, request, payment_id):
        return get_object_or_404(
            Payments,
            id=payment_id,
            debt__user=request.user
        )

    # ดูรายละเอียดการชำระ
    def get(self, request, payment_id):
        payment = self.get_payment(
            request,
            payment_id
        )

        serializer = PaymentSerializer(payment)

        return Response(serializer.data)

    #อัพเดตยอดคงเหลือถ้ามีการแก้ไขยอดชำระหนี้
    @transaction.atomic
    def put(self, request, payment_id):
        payment = self.get_payment(
            request,
            payment_id
        )

        old_paid_amount = payment.paid_amount

        serializer = PaymentSerializer(
            payment,
            data=request.data,
            partial=True
        )

        serializer.is_valid(
            raise_exception=True
        )

        updated_payment = serializer.save()

        new_paid_amount = updated_payment.paid_amount

        # หาส่วนต่างระหว่างยอดใหม่กับยอดเดิม
        difference = new_paid_amount - old_paid_amount

        debt = payment.debt

        # ปรับยอดคงเหลือ
        debt.remaining_amount -= difference

        # ป้องกันยอดติดลบ
        if debt.remaining_amount <= 0:
            debt.remaining_amount = Decimal('0.00')
            debt.status = 'paid'
        else:
            debt.status = 'ongoing'

        debt.save()

        return Response(
            PaymentSerializer(updated_payment).data,
            status=status.HTTP_200_OK
        )

    # ลบรายการชำระ
    @transaction.atomic
    def delete(self, request, payment_id):
        payment = self.get_payment(
            request,
            payment_id
        )

        debt = payment.debt

        # คืนยอดที่เคยหักออกไป
        debt.remaining_amount += payment.paid_amount

        if debt.remaining_amount > 0:
            debt.status = 'ongoing'

        debt.save()

        payment.delete()

        return Response(
            {'detail': 'ลบรายการชำระเรียบร้อยแล้ว'},
            status=status.HTTP_200_OK
        )

