from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db import transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404 
#ฟังก์ชันของ Django ที่ใช้ตรวจว่าถ้าเจอข้อมูลให้ return obj ถ้าไม่เจอส่ง http 404

from .models import Debts, Payments
from .serializers import DebtSerializer, PaymentSerializer

from decimal import Decimal
from line_bot.messaging import push_new_debt_notification

import os
import uuid
import requests
from calendar import monthrange
from datetime import date

# อัพโหลดรูปไป Supabase Storage
def upload_debt_image(image_file):
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    bucket_name = os.getenv("SUPABASE_STORAGE_BUCKET", "debt-images")

    if not supabase_url or not supabase_key:
        raise Exception(
            "ไม่พบ SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY"
        )

    file_extension = os.path.splitext(image_file.name)[1].lower()
    file_name = f"{uuid.uuid4()}{file_extension}"

    upload_url = (
        f"{supabase_url}/storage/v1/object/"
        f"{bucket_name}/{file_name}"
    )

    headers = {
        "Authorization": f"Bearer {supabase_key}",
        "apikey": supabase_key,
        "Content-Type": image_file.content_type,
    }

    response = requests.post(
        upload_url,
        headers=headers,
        data=image_file.read()
    )

    if not response.ok:
        raise Exception(
            f"อัปโหลดรูปไม่สำเร็จ: {response.text}"
        )

    public_url = (
        f"{supabase_url}/storage/v1/object/public/"
        f"{bucket_name}/{file_name}"
    )

    return public_url


# ======================================ส่วนรายการหนี้สิน======================================
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
        data = request.data.copy()

        image_file = request.FILES.get("image")

        print("========== DEBUG IMAGE ==========")
        print("FILES:", request.FILES)
        print("IMAGE FILE:", image_file)
        print("=================================")
        
        if image_file:
            try:
                image_url = upload_debt_image(image_file)
                data["image"] = image_url

            except Exception as error:
                return Response(
                    {"detail": str(error)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        serializer = DebtSerializer(
            data=data
        )

        serializer = DebtSerializer(
            data=data
        )

        if not serializer.is_valid():
            print("========== SERIALIZER ERROR ==========")
            print(serializer.errors)
            print("======================================")
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        debt = serializer.save(user=request.user)

        try:
            push_new_debt_notification(debt)
        except Exception:
            import logging
            logging.getLogger(__name__).exception(
                "Failed to send LINE debt notification"
            )

        return Response(
            DebtSerializer(debt).data,
            status=status.HTTP_201_CREATED
        )


class DebtDetailView(APIView):
    permission_classes = [IsAuthenticated]

    #ตรวจว่าเป็นหนี้ก้อนไหนและเป็นของuserที่ส่งrequestมาจริงมั้ย
    def get_debt(self, request, debt_id):
        return get_object_or_404(
            Debts,
            id=debt_id,
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
        
        debt = self.get_debt(request, debt_id)
        data = request.data.copy()

        # ไม่รับยอดคงเหลือจาก Frontend
        # เพราะ Backend จะคำนวณจาก Payments ใหม่
        data.pop("remaining_amount", None)

        # ถ้ามีการเลือกรูปใหม่
        image_file = request.FILES.get("image")

        if image_file:
            try:
                image_url = upload_debt_image(image_file)
                data["image"] = image_url

            except Exception as error:
                return Response(
                    {"detail": str(error)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        elif data.get("image") == "":
            data["image"] = None

        serializer = DebtSerializer(
            debt,
            data=data
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        # คำนวณยอดคงเหลือใหม่
        recalculate_debt_remaining(debt)

        # โหลดข้อมูลล่าสุดหลังคำนวณ
        debt.refresh_from_db()

        return Response(
            DebtSerializer(debt).data,
            status=status.HTTP_200_OK
        )

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

# ======================================ส่วนการชำระหนี้======================================
# กำหนดวันครบกำหนดชำระหนี้ตามประเภทการชำระ
def calculate_payment_due_date(debt):
    """
    คำนวณ due_date ของ Payment จากข้อมูลของ Debts
    """

    # กรณีทยอยจ่าย
    if debt.payment_type == "flexible":
        return debt.due_date

    # กรณีรายเดือน
    if debt.payment_type == "monthly":
        if not debt.payment_date:
            raise ValueError(
                "หนี้แบบรายเดือนต้องระบุ payment_date"
            )

        today = date.today()

        # จำนวนวันของเดือนปัจจุบัน
        last_day = monthrange(today.year, today.month)[1]

        # ป้องกัน payment_date เช่น 31
        # ในเดือนที่มีเพียง 30 หรือ 28/29 วัน
        day = min(debt.payment_date, last_day)

        due_date = date(
            today.year,
            today.month,
            day
        )

        # ถ้าวันกำหนดชำระของเดือนนี้ผ่านไปแล้ว
        # ให้เลื่อนไปเดือนถัดไป
        if due_date < today:

            if today.month == 12:
                next_year = today.year + 1
                next_month = 1
            else:
                next_year = today.year
                next_month = today.month + 1

            last_day = monthrange(
                next_year,
                next_month
            )[1]

            day = min(
                debt.payment_date,
                last_day
            )

            due_date = date(
                next_year,
                next_month,
                day
            )

        return due_date

    raise ValueError(
        "ไม่พบประเภทการชำระหนี้ที่ถูกต้อง"
    )
#ฟังก์ชันคำนวณยอดหนี้คงเหลือ = ยอดทั้งหมด - ยอดที่ชำระ/ได้รับคืนจาก Payments ทั้งหมด
def recalculate_debt_remaining(debt):
    """
    คำนวณยอดคงเหลือจากยอดทั้งหมด
    หักด้วยยอดที่ชำระ/ได้รับคืนจาก Payments ทั้งหมด
    """

    paid_total = Payments.objects.filter(
        debt=debt
    ).aggregate(
        total=Sum("paid_amount")
    )["total"] or Decimal("0.00")

    remaining = (
        Decimal(debt.total_amount) -
        Decimal(paid_total)
    )

    if remaining < 0:
        remaining = Decimal("0.00")

    debt.remaining_amount = remaining

    if remaining == Decimal("0.00"):
        debt.status = "paid"
    else:
        debt.status = "ongoing"

    debt.save(
        update_fields=[
            "remaining_amount",
            "status",
            "updated_at",
        ]
    )

    return remaining

#รายการชำระหนี้
class PaymentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_debt(self, request, debt_id):
        return get_object_or_404(
            Debts,
            id=debt_id,
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

    # เพิ่มรายการชำระหนี้
    @transaction.atomic
    def post(self, request, debt_id):
        debt = self.get_debt(
            request,
            debt_id
        )

        data = request.data.copy()

        # อัปโหลดหลักฐานการชำระ
        proof_file = request.FILES.get("proof_image")

        if proof_file:
            try:
                proof_url = upload_debt_image(proof_file)
                data["proof_image"] = proof_url

            except Exception as error:
                return Response(
                    {"detail": str(error)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        # =========================
        # ถ้าเป็น monthly
        # ให้ scheduled_amount เป็น payment_amount
        # =========================
        if (
            debt.payment_type == "monthly"
            and debt.payment_amount is not None
            and not data.get("scheduled_amount")
        ):
            data["scheduled_amount"] = debt.payment_amount

        # =========================
        # กำหนดวันครบกำหนดของรายการชำระ
        # =========================
        try:
            data["due_date"] = calculate_payment_due_date(debt).isoformat()

        except ValueError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = PaymentSerializer(
            data=data
        )

        serializer.is_valid(
            raise_exception=True
        )

        paid_amount = serializer.validated_data.get(
            'paid_amount',
            Decimal('0.00')
        )

        # ห้ามจ่ายเกินยอดหนี้
        if paid_amount > debt.remaining_amount:
            return Response(
                {
                    'detail': 'จำนวนเงินที่ชำระเกินยอดหนี้คงเหลือ'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # =========================
        # สร้างประวัติการชำระ
        # =========================
        payment = serializer.save(
            debt=debt
        )

        # =========================
        # คำนวณยอดหนี้คงเหลือโดยเรียกใช้ฟังก์ชัน recalculate_debt_remaining
        # =========================
        recalculate_debt_remaining(debt)

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
        payment = self.get_payment(request, payment_id)
        debt = payment.debt

        old_paid_amount = payment.paid_amount
        data = request.data.copy()

        # อัปโหลดรูปใหม่ไป Supabase Storage
        proof_file = request.FILES.get("proof_image")

        if proof_file:
            try:
                data["proof_image"] = upload_debt_image(proof_file)
            except Exception as error:
                return Response(
                    {"detail": str(error)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        # ถ้าสั่งลบรูป และไม่ได้ส่งรูปใหม่มา
        remove_proof_image = (
            str(data.get("remove_proof_image", "")).lower()
            in ("true", "1", "yes")
        )

        data.pop("remove_proof_image", None)

        if remove_proof_image and not proof_file:
            data["proof_image"] = None

        serializer = PaymentSerializer(
            payment,
            data=data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)

        new_paid_amount = serializer.validated_data.get(
            "paid_amount",
            old_paid_amount,
        )

        # ยอดชำระใหม่ต้องไม่เกินยอดหนี้ที่ยังมีอยู่
        # ยอดคงเหลือปัจจุบัน + ยอดเดิมของรายการนี้
        available_amount = debt.remaining_amount + old_paid_amount

        if new_paid_amount < 0:
            return Response(
                {"detail": "ยอดชำระต้องไม่ติดลบ"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_paid_amount > available_amount:
            return Response(
                {"detail": "ยอดชำระเกินยอดหนี้คงเหลือ"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # บันทึกข้อมูล Payments
        updated_payment = serializer.save()

        # คำนวณยอดหนี้คงเหลือใหม่จาก Payments ทั้งหมด
        recalculate_debt_remaining(debt)

        # ปรับสถานะรายการชำระตามยอดที่บันทึก
        if new_paid_amount <= 0:
            updated_payment.payment_status = "pending"
        elif (
            updated_payment.scheduled_amount is not None
            and new_paid_amount < updated_payment.scheduled_amount
        ):
            updated_payment.payment_status = "partial"
        else:
            updated_payment.payment_status = "paid"

        updated_payment.save(
            update_fields=["payment_status", "updated_at"]
        )

        return Response(
            PaymentSerializer(updated_payment).data,
            status=status.HTTP_200_OK,
        )


    # ลบรายการชำระ
    @transaction.atomic
    def delete(self, request, payment_id):
        payment = self.get_payment(
            request,
            payment_id
        )

        debt = payment.debt

        payment.delete()

        # คำนวณยอดคงเหลือใหม่จาก Payments ที่เหลือ
        recalculate_debt_remaining(debt)

        return Response(
            {'detail': 'ลบรายการชำระเรียบร้อยแล้ว'},
            status=status.HTTP_200_OK
        )
