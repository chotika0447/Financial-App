import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import date

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


class TransactionListCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        transactions = Transaction.objects.filter(
            user=request.user
        ).order_by(
            "-transaction_date",
            "-transaction_time",
            "-created_at",
            "-id"
        )

        transaction_type = request.query_params.get(
            "transaction_type"
        )

        if transaction_type:

            if transaction_type not in Transaction.TransactionType.values:
                return Response(
                    {
                        "transaction_type": [
                            "Choose income or expense."
                        ]
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            transactions = transactions.filter(
                transaction_type=transaction_type
            )

        serializer = TransactionSerializer(
            transactions,
            many=True
        )

        return Response(serializer.data)

    def post(self, request):

        serializer = TransactionSerializer(
            data=request.data
        )

        if serializer.is_valid():

            new_transaction = serializer.save(
                user=request.user
            )

            return Response(
                TransactionSerializer(new_transaction).data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
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

        transaction_item = self.get_object(
            request,
            pk
        )

        if transaction_item is None:
            return Response(
                {"error": "Transaction not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TransactionSerializer(
            transaction_item
        )

        return Response(serializer.data)

    def put(self, request, pk):
        return self.update(request, pk, partial=False)

    def patch(self, request, pk):
        return self.update(request, pk, partial=True)

    def update(self, request, pk, partial):

        transaction_item = self.get_object(
            request,
            pk
        )

        if transaction_item is None:
            return Response(
                {"error": "Transaction not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TransactionSerializer(
            transaction_item,
            data=request.data,
            partial=partial
        )

        if serializer.is_valid():

            transaction_item = serializer.save()

            if request.data.get("remove_receipt") == "true":
                transaction_item.receipt = None
                transaction_item.save(
                    update_fields=["receipt"]
                )

            return Response(
                TransactionSerializer(
                    transaction_item
                ).data
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, pk):

        transaction_item = self.get_object(
            request,
            pk
        )

        if transaction_item is None:
            return Response(
                {"error": "Transaction not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        transaction_item.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


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

        if net_monthly_income > 0:

            expense_ratio = (
                expense_total
                / net_monthly_income
                * Decimal("100")
            ).quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP
            )

        else:
            expense_ratio = None

        # TRC: Transaction Recording Consistency

        month_periods = []

        for offset in reversed(range(3)):

            month_index = (
                today.year * 12
                + today.month - 1
                - offset
            )

            year, month_index = divmod(
                month_index,
                12
            )

            month = month_index + 1

            month_periods.append({
                "year": year,
                "month": month,
                "has_income": False,
                "has_expense": False,
                "income_count": 0,
                "expense_count": 0
            })

        first_period = month_periods[0]

        period_start = date(
            first_period["year"],
            first_period["month"],
            1
        )

        period_transactions = Transaction.objects.filter(
            user=request.user,
            transaction_date__gte=period_start,
            transaction_date__lte=today
        ).values(
            "transaction_date",
            "transaction_type"
        )

        period_lookup = {
            (item["year"], item["month"]): item
            for item in month_periods
        }

        for transaction_item in period_transactions:

            transaction_date = transaction_item[
                "transaction_date"
            ]

            key = (
                transaction_date.year,
                transaction_date.month
            )

            month_data = period_lookup.get(key)

            if not month_data:
                continue

            if transaction_item["transaction_type"] == "income":

                month_data["has_income"] = True
                month_data["income_count"] += 1

            elif transaction_item["transaction_type"] == "expense":

                month_data["has_expense"] = True
                month_data["expense_count"] += 1

        complete_months = sum(
            1
            for item in month_periods
            if item["has_income"] and item["has_expense"]
        )

        trc_percentage = (
            Decimal(complete_months)
            / Decimal("3")
            * Decimal("100")
        ).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP
        )

        return Response({
            "year": today.year,
            "month": today.month,
            "expense_total": expense_total,
            "transaction_income_total": transaction_income_total,
            "monthly_income": monthly_income,
            "net_monthly_income": net_monthly_income,
            "expense_ratio": expense_ratio,
            "trc_period_months": 3,
            "trc_complete_months": complete_months,
            "trc_percentage": trc_percentage,
            "trc_months": month_periods
        })