from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db import transaction
from django.db.models import Sum, Q
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

        # อัปโหลดรูปก่อนเริ่มสร้างรายการ
        if image_file:
            try:
                data["image"] = upload_debt_image(image_file)
            except Exception as error:
                return Response(
                    {"detail": str(error)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        serializer = DebtSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        counterparty = serializer.validated_data.get("counterparty")

        # ไม่อนุญาตให้เลือกตัวเองเป็นคู่สัญญา
        if counterparty and counterparty.pk == request.user.pk:
            return Response(
                {"counterparty": "ไม่สามารถเลือกตัวเองเป็นคู่สัญญาได้"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        paired_debt = None

        # สร้างรายการของทั้งสองคนภายใน transaction เดียวกัน
        with transaction.atomic():
            debt = serializer.save(user=request.user)
            # กำหนดวันครบกำหนดงวดแรกสำหรับหนี้รายเดือน
            if (
                debt.payment_type == "monthly"
                and not debt.current_due_date
            ):
                debt.current_due_date = (
                    get_initial_monthly_due_date(debt)
                )
                debt.save(
                    update_fields=[
                        "current_due_date",
                        "updated_at",
                    ]
                )

            if counterparty:
                opposite_type = (
                    "lent" if debt.type == "borrowed" else "borrowed"
                )

                # สร้างรายการในบัญชีของเพื่อน
                paired_debt = Debts.objects.create(
                    name=debt.name,
                    user=counterparty,
                    counterparty=request.user,
                    counterparty_name=str(request.user),
                    type=opposite_type,
                    total_amount=debt.total_amount,
                    remaining_amount=debt.total_amount,
                    payment_type=debt.payment_type,
                    payment_amount=debt.payment_amount,
                    due_date=debt.due_date,
                    payment_date=debt.payment_date,
                    current_due_date=debt.current_due_date,
                    status="ongoing",
                    note=debt.note,
                    icon=debt.icon,
                    color=debt.color,
                    image=debt.image,
                )

                # เชื่อมรายการของทั้งสองฝั่งเข้าด้วยกัน
                debt.paired_debt = paired_debt
                paired_debt.paired_debt = debt

                debt.save(update_fields=["paired_debt", "updated_at"])
                paired_debt.save(
                    update_fields=["paired_debt", "updated_at"]
                )

            # ส่งแจ้งเตือนหลังจาก transaction สำเร็จแล้วเท่านั้น
            if paired_debt:
                transaction.on_commit(
                    lambda debt_id=debt.pk, paired_id=paired_debt.pk:
                        self.send_debt_notification(debt_id, paired_id)
                )

        debt.refresh_from_db()

        return Response(
            DebtSerializer(debt).data,
            status=status.HTTP_201_CREATED,
        )


    def send_debt_notification(self, debt_id, paired_debt_id):
        import logging

        logger = logging.getLogger(__name__)

        try:
            debt = Debts.objects.get(pk=debt_id)
            paired_debt = Debts.objects.get(pk=paired_debt_id)

            # รอปรับฟังก์ชัน LINE ให้รองรับ ID รายการของผู้รับ
            push_new_debt_notification(
                debt,
                target_debt=paired_debt,
            )
        except Exception:
            logger.exception("Failed to send LINE debt notification")


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
    
    # ลบหนี้ของตัวเองและรายการหนี้ที่เชื่อมกับเพื่อน
    @transaction.atomic
    def delete(self, request, debt_id):
        debt = self.get_debt(request, debt_id)

        # เก็บ ID ของหนี้ทั้งสองฝั่งก่อนลบ
        debt_ids = [debt.pk]

        if debt.paired_debt_id:
            paired_debt = Debts.objects.filter(
                pk=debt.paired_debt_id
            ).first()

            if paired_debt:
                # ลบรายการคู่กันเฉพาะเมื่อเชื่อมกลับมาหากันจริง
                if paired_debt.paired_debt_id == debt.pk:
                    debt_ids.append(paired_debt.pk)

        # ลบพร้อมกันภายใน transaction เดียว
        # Payments จะถูกลบตาม on_delete=models.CASCADE
        Debts.objects.filter(pk__in=debt_ids).delete()

        return Response(
            {
                "detail": "ลบรายการหนี้เรียบร้อยแล้ว",
                "deleted_debt_ids": debt_ids,
            },
            status=status.HTTP_200_OK,
        )


# ======================================ส่วนการชำระหนี้======================================


def get_monthly_due_date(year, month, payment_day):
    """
    สร้างวันที่ครบกำหนดรายเดือน
    หากเดือนนั้นไม่มีวันที่กำหนด ให้ใช้วันสุดท้ายของเดือน
    """
    last_day = monthrange(year, month)[1]
    day = min(payment_day, last_day)
    return date(year, month, day)


def get_initial_monthly_due_date(debt, today=None):
    """
    คำนวณวันครบกำหนดงวดแรก
    เลือกวันที่กำหนดในเดือนนี้ หากผ่านไปแล้วให้เลือกเดือนถัดไป
    """
    if not debt.payment_date:
        raise ValueError(
            "หนี้แบบรายเดือนต้องระบุ payment_date"
        )

    if today is None:
        today = date.today()

    due_date = get_monthly_due_date(
        today.year,
        today.month,
        debt.payment_date,
    )

    if due_date < today:
        if today.month == 12:
            year = today.year + 1
            month = 1
        else:
            year = today.year
            month = today.month + 1

        due_date = get_monthly_due_date(
            year,
            month,
            debt.payment_date,
        )

    return due_date


def get_next_monthly_due_date(current_due_date, payment_day):
    """
    เลื่อนวันครบกำหนดไปเดือนถัดไป
    โดยรักษาวันที่กำหนดชำระเดิมไว้
    """
    if current_due_date.month == 12:
        year = current_due_date.year + 1
        month = 1
    else:
        year = current_due_date.year
        month = current_due_date.month + 1

    return get_monthly_due_date(
        year,
        month,
        payment_day,
    )


def calculate_payment_due_date(debt):
    """
    คืนวันครบกำหนดของงวดปัจจุบัน
    """
    if debt.payment_type == "flexible":
        return debt.due_date

    if debt.payment_type == "monthly":
        if not debt.payment_date:
            raise ValueError(
                "หนี้แบบรายเดือนต้องระบุ payment_date"
            )

        if debt.current_due_date:
            return debt.current_due_date

        return get_initial_monthly_due_date(debt)

    raise ValueError(
        "ไม่พบประเภทการชำระหนี้ที่ถูกต้อง"
    )


def get_related_debts(debt):
    """
    คืนรายการหนี้ของทั้งสองฝ่ายที่เชื่อมกัน
    """
    debts = [debt]

    if debt.paired_debt_id:
        paired_debt = Debts.objects.get(
            pk=debt.paired_debt_id
        )
        debts.append(paired_debt)

    return debts


def recalculate_debt_remaining(debt):
    """
    คำนวณยอดคงเหลือของหนี้ทั้งสองฝั่ง
    โดยใช้ประวัติการชำระร่วมกัน
    """
    related_debts = get_related_debts(debt)
    related_debt_ids = [d.pk for d in related_debts]

    paid_total = (
        Payments.objects.filter(
            debt_id__in=related_debt_ids
        ).aggregate(
            total=Sum("paid_amount")
        )["total"]
        or Decimal("0.00")
    )

    for related_debt in related_debts:
        remaining = (
            Decimal(related_debt.total_amount)
            - Decimal(paid_total)
        )

        if remaining < Decimal("0.00"):
            remaining = Decimal("0.00")

        related_debt.remaining_amount = remaining
        related_debt.status = (
            "paid"
            if remaining == Decimal("0.00")
            else "ongoing"
        )

        related_debt.save(
            update_fields=[
                "remaining_amount",
                "status",
                "updated_at",
            ]
        )

    return related_debts[0].remaining_amount


#รายการชำระหนี้

class PaymentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_debt(self, request, debt_id):
        return get_object_or_404(
            Debts,
            id=debt_id,
            user=request.user,
        )

    # ดึงประวัติของหนี้ทั้งสองฝั่ง
    def get(self, request, debt_id):
        debt = self.get_debt(request, debt_id)

        related_debts = get_related_debts(debt)
        related_debt_ids = [
            item.pk for item in related_debts
        ]

        payments = Payments.objects.filter(
            debt_id__in=related_debt_ids
        ).order_by("-paid_date", "-created_at")

        serializer = PaymentSerializer(
            payments,
            many=True,
        )

        return Response(serializer.data)

    # สร้างรายการชำระ
    @transaction.atomic
    def post(self, request, debt_id):
        debt = self.get_debt(request, debt_id)

        # อัปเดตยอดหนี้ทั้งสองฝั่งให้เป็นปัจจุบันก่อน
        recalculate_debt_remaining(debt)
        debt.refresh_from_db()

        data = request.data.copy()
        proof_file = request.FILES.get("proof_image")

        if proof_file:
            try:
                data["proof_image"] = upload_debt_image(
                    proof_file
                )
            except Exception as error:
                return Response(
                    {"detail": str(error)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        if (
            debt.payment_type == "monthly"
            and debt.payment_amount is not None
            and not data.get("scheduled_amount")
        ):
            data["scheduled_amount"] = debt.payment_amount

        try:
            current_installment_due_date = (
                calculate_payment_due_date(debt)
            )
            data["due_date"] = (
                current_installment_due_date.isoformat()
            )
        except ValueError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PaymentSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        paid_amount = serializer.validated_data.get(
            "paid_amount",
            Decimal("0.00"),
        )

        # ตรวจสอบยอดรวมจากหนี้ทั้งสองฝั่ง
        related_debts = get_related_debts(debt)
        related_debt_ids = [
            item.pk for item in related_debts
        ]

        paid_total = (
            Payments.objects.filter(
                debt_id__in=related_debt_ids
            ).aggregate(total=Sum("paid_amount"))["total"]
            or Decimal("0.00")
        )

        shared_remaining = (
            Decimal(debt.total_amount) - Decimal(paid_total)
        )

        if paid_amount < Decimal("0.00"):
            return Response(
                {"detail": "ยอดชำระต้องไม่ติดลบ"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if paid_amount > shared_remaining:
            return Response(
                {"detail": "จำนวนเงินที่ชำระเกินยอดหนี้คงเหลือ"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # สร้าง Payment เพียงรายการเดียว
        payment = serializer.save(debt=debt)

        # คำนวณยอดหนี้ทั้งสองฝั่ง
        recalculate_debt_remaining(debt)

        # เลื่อนงวดเฉพาะเมื่อเป็นหนี้รายเดือนและตอนยอดที่ชำระรวมของงวดนี้ครบแล้วเท่านั้น
        if (
            debt.payment_type == "monthly"
            and debt.payment_amount is not None
            and paid_amount > Decimal("0.00")
        ):
            debt.refresh_from_db()

            related_debts = get_related_debts(debt)
            related_debt_ids = [
                item.pk for item in related_debts
            ]

            # รวมยอดที่ชำระทั้งหมดในงวดปัจจุบัน
            installment_paid_total = (
                Payments.objects.filter(
                    debt_id__in=related_debt_ids,
                    due_date=current_installment_due_date,
                ).aggregate(
                    total=Sum("paid_amount")
                )["total"]
                or Decimal("0.00")
            )

            # ยอดที่ต้องจ่ายในงวดนี้
            # งวดสุดท้ายไม่ควรเกินยอดหนี้ที่เหลือก่อนชำระ
            installment_target = min(
                Decimal(debt.payment_amount),
                Decimal(shared_remaining),
            )

            if (
                installment_target > Decimal("0.00")
                and installment_paid_total >= installment_target
                and debt.remaining_amount > Decimal("0.00")
            ):
                next_due_date = get_next_monthly_due_date(
                    current_installment_due_date,
                    debt.payment_date,
                )

                # อัปเดตวันครบกำหนดให้หนี้ทั้งสองฝ่าย
                for related_debt in related_debts:
                    related_debt.current_due_date = next_due_date
                    related_debt.save(
                        update_fields=[
                            "current_due_date",
                            "updated_at",
                        ]
                    )

        return Response(
            PaymentSerializer(payment).data,
            status=status.HTTP_201_CREATED,
        )




class PaymentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_payment(self, request, payment_id):
        return get_object_or_404(
            Payments.objects.filter(
                Q(debt__user=request.user)
                | Q(debt__paired_debt__user=request.user)
            ),
            id=payment_id
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
        recalculate_debt_remaining(updated_payment.debt)

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
