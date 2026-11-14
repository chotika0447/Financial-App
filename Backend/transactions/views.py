import logging
from decimal import Decimal
from calendar import monthrange

from django.db import transaction as db_transaction
from django.db.models import Sum
from django.utils import timezone

from PIL import UnidentifiedImageError

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Transaction
from .serializers import TransactionSerializer
from .ocr_api import run_ocr
from .slip_parser import parse_slip

from users.models import PersonalProfile

from line_bot.supabase_storage import (
    upload_receipt,
    get_receipt_signed_url,
    delete_receipt,
)


logger = logging.getLogger(__name__)


def cleanup_new_receipt(path):
    # Never delete legacy receipts: their storage location is ambiguous.
    if not path or not path.startswith("receipts/transactions/"):
        return
    try:
        delete_receipt(path)
    except Exception:
        logger.exception("Failed to delete receipt: %s", path)




class TransactionListCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        transactions = Transaction.objects.filter(user=request.user).order_by(
            "-transaction_date", "-transaction_time", "-created_at", "-id"
        )

        transaction_type = request.query_params.get("transaction_type")

        if transaction_type:
            if transaction_type not in Transaction.TransactionType.values:
                return Response(
                    {"transaction_type": ["Choose income or expense."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            transactions = transactions.filter(transaction_type=transaction_type)

        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)

    def post(self, request):

        serializer = TransactionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_transaction = serializer.save(user=request.user)
        return Response(
            TransactionSerializer(new_transaction).data,
            status=status.HTTP_201_CREATED,
        )


class TransactionDetailView(APIView):

    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):

        try:
            return Transaction.objects.get(
                id=pk,
                user=request.user
            )

        except Transaction.DoesNotExist:
            return None

    def get(self, request, pk):

        transaction_item = self.get_object(request, pk)

        if transaction_item is None:
            return Response(
                {"error": "Transaction not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TransactionSerializer(transaction_item)
        return Response(serializer.data)

    def put(self, request, pk):
        return self.update(request, pk, partial=False)

    def patch(self, request, pk):
        return self.update(request, pk, partial=True)

    def update(self, request, pk, partial):
        transaction_item = self.get_object(request, pk)
        if transaction_item is None:
            return Response({"error": "Transaction not found"}, status=404)

        remove_receipt = str(request.data.get("remove_receipt", "")).lower() == "true"
        new_image = request.FILES.get("receipt")
        if remove_receipt and new_image:
            return Response(
                {"receipt": ["Cannot upload and remove a receipt together."]},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Remove is a separate action, not a nullable image upload.
        # Copy request data so the original request remains unchanged.
        update_data = request.data.copy()
        if remove_receipt:
            update_data.pop("receipt", None)

        serializer = TransactionSerializer(
            transaction_item, data=update_data, partial=partial
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        old_path = transaction_item.receipt.name if transaction_item.receipt else None
        with db_transaction.atomic():
            transaction_item = serializer.save()
            if remove_receipt:
                transaction_item.receipt = None
                transaction_item.save(update_fields=["receipt"])
            new_path = transaction_item.receipt.name if transaction_item.receipt else None
            if old_path and old_path != new_path:
                db_transaction.on_commit(lambda path=old_path: cleanup_new_receipt(path))

        return Response(TransactionSerializer(transaction_item).data)

    def delete(self, request, pk):
        transaction_item = self.get_object(request, pk)
        if transaction_item is None:
            return Response({"error": "Transaction not found"}, status=404)

        old_path = transaction_item.receipt.name if transaction_item.receipt else None
        with db_transaction.atomic():
            transaction_item.delete()
            if old_path:
                db_transaction.on_commit(lambda path=old_path: cleanup_new_receipt(path))
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReceiptOCRView(APIView):

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):

        image = request.FILES.get("image")

        if not image:
            return Response(
                {"error": "กรุณาอัปโหลดรูปภาพ"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if image.content_type not in [
            "image/jpeg",
            "image/png"
        ]:
            return Response(
                {"error": "รองรับเฉพาะไฟล์ JPG และ PNG"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if image.size > 5 * 1024 * 1024:
            return Response(
                {"error": "รูปภาพต้องมีขนาดไม่เกิน 5 MB"},
                status=status.HTTP_400_BAD_REQUEST
            )

        logger.info(
            "Receipt OCR: request received size=%s content_type=%s",
            image.size,
            image.content_type
        )

        storage_path = None

        try:

            filename = (
                "receipt.png"
                if image.content_type == "image/png"
                else "receipt.jpg"
            )

            image_bytes = image.read()

            storage_path = upload_receipt(
                image_bytes,
                filename=filename
            )

            logger.info(
                "Receipt OCR: temporary image uploaded to Supabase"
            )

            file_url = get_receipt_signed_url(
                storage_path
            )

            if not file_url:
                raise Exception(
                    "ไม่สามารถสร้าง Supabase Signed URL ได้"
                )

            raw_pages = run_ocr(file_url)

            parsed = parse_slip(raw_pages)

            logger.info(
                "Receipt OCR: parsing completed"
            )

            return Response({
                "date": parsed.get("date"),
                "time": parsed.get("time"),
                "amount": parsed.get("amount"),
                "note": parsed.get("note") or {},
                "needs_review": parsed.get(
                    "needs_review",
                    True
                ),
                "ocr_text": parsed.get("ocr_text") or []
            })

        except (UnidentifiedImageError, OSError):

            logger.exception(
                "Receipt OCR: invalid or unreadable image"
            )

            return Response(
                {"error": "ไม่สามารถอ่านไฟล์รูปภาพได้"},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception:

            logger.exception(
                "Receipt OCR processing failed"
            )

            return Response(
                {"error": "เกิดข้อผิดพลาดในการประมวลผล OCR"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        finally:

            if storage_path:

                try:
                    delete_receipt(storage_path)

                    logger.info(
                        "Receipt OCR: temporary image deleted"
                    )

                except Exception:

                    logger.exception(
                        "Receipt OCR: failed to delete temporary image"
                    )



class FinHealthSpendView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        today = timezone.localdate()

        current_month_transactions = Transaction.objects.filter(
            user=request.user,
            transaction_date__year=today.year,
            transaction_date__month=today.month
        )

        expense_total = (
            current_month_transactions
            .filter(transaction_type="expense")
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        transaction_income_total = (
            current_month_transactions
            .filter(transaction_type="income")
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        profile = PersonalProfile.objects.filter(
            user=request.user
        ).first()

        monthly_income = (
            profile.salary
            if profile
            else Decimal("0.00")
        )

        net_monthly_income = (
            monthly_income + transaction_income_total
        )

        # EIR: Expense-to-Income Ratio
        if net_monthly_income > 0:

            expense_ratio = expense_total / net_monthly_income * 100
            expense_ratio = round(expense_ratio, 2)

        else:
            expense_ratio = None

        # TRC: Transaction Recording Consistency
        # ประเมินข้อมูลของ 1 เดือน

        days_in_month = monthrange(
            today.year,
            today.month
        )[1]

        # จำนวนวันที่ใช้ประเมิน
        # เดือนปัจจุบันประเมินถึงวันนี้เท่านั้น
        days_evaluated = today.day

        # ดึงรายการรายรับและรายจ่ายของเดือนปัจจุบัน
        trc_transactions = Transaction.objects.filter(
            user=request.user,
            transaction_date__year=today.year,
            transaction_date__month=today.month,
            transaction_date__lte=today
        ).values(
            "transaction_date",
            "transaction_type"
        )

        # เก็บจำนวนรายการแยกตามวันที่
        daily_records = {}

        for item in trc_transactions:

            recorded_date = item["transaction_date"]
            day = recorded_date.day

            if day not in daily_records:
                daily_records[day] = {
                    "date": recorded_date.isoformat(),
                    "day": day,
                    "income_count": 0,
                    "expense_count": 0,
                }

            if item["transaction_type"] == "income":
                daily_records[day]["income_count"] += 1

            elif item["transaction_type"] == "expense":
                daily_records[day]["expense_count"] += 1

        # เรียงข้อมูลวันที่จากน้อยไปมาก
        daily_records_list = sorted(
            daily_records.values(),
            key=lambda item: item["day"]
        )

        # 1. Recording Frequency (RF)
        # จำนวนวันที่มีการบันทึก / จำนวนวันที่ใช้ประเมิน x 100

        recorded_days = len(daily_records)

        recording_frequency = Decimal(recorded_days) / Decimal(days_evaluated) * 100
        recording_frequency = round(recording_frequency, 2)

        # 2. Recording Distribution (RD)
        # แบ่งเดือนออกเป็น 4 ช่วง

        period_definitions = [
            {
                "period": 1,
                "start_day": 1,
                "end_day": 7,
            },
            {
                "period": 2,
                "start_day": 8,
                "end_day": 14,
            },
            {
                "period": 3,
                "start_day": 15,
                "end_day": 21,
            },
            {
                "period": 4,
                "start_day": 22,
                "end_day": days_in_month,
            },
        ]

        trc_periods = []
        recorded_periods = 0

        for period in period_definitions:

            start_day = period["start_day"]
            end_day = min(
                period["end_day"],
                days_evaluated
            )

            # ตรวจสอบว่าช่วงนี้มีวันที่บันทึกหรือไม่
            period_recorded_days = [
                item["day"]
                for item in daily_records_list
                if start_day <= item["day"] <= end_day
            ] if start_day <= days_evaluated else []

            has_records = len(period_recorded_days) > 0

            if has_records:
                recorded_periods += 1

            trc_periods.append({
                "period": period["period"],
                "start_day": start_day,
                "end_day": period["end_day"],
                "recorded_days": period_recorded_days,
                "has_records": has_records,
            })

        recording_distribution = Decimal(recorded_periods) / 4 * 100
        recording_distribution = round(recording_distribution, 2)

        # 3. TRC Score
        # (RF + RD) / 2

        trc_score = (
            recording_frequency + recording_distribution
        ) / Decimal("2")

        trc_score = round(trc_score, 2)

        return Response({
            # EIR
            "year": today.year,
            "month": today.month,
            "expense_total": expense_total,
            "transaction_income_total": transaction_income_total,
            "monthly_income": monthly_income,
            "net_monthly_income": net_monthly_income,
            "expense_ratio": expense_ratio,

            # TRC
            "trc_days_evaluated": days_evaluated,
            "trc_days_in_month": days_in_month,
            "trc_recorded_days": recorded_days,
            "trc_recording_frequency": recording_frequency,

            "trc_recorded_periods": recorded_periods,
            "trc_total_periods": 4,
            "trc_recording_distribution": recording_distribution,

            "trc_score": trc_score,

            "trc_daily_records": daily_records_list,
            "trc_periods": trc_periods,
        })
