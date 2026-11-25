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
from categories.category_matching import match_category, fallback_category

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

        # Require a category for transactions created through this HTTP endpoint.
        # Do not change TransactionSerializer's global required setting: LINE OA
        # may use it independently and retains its existing matching/fallback flow.
        category_value = request.data.get("category")
        if category_value is None or not str(category_value).strip():
            return Response(
                {"category": ["กรุณาเลือกหมวดหมู่ก่อนบันทึกรายการ"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

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

            date = parsed.get("date")
            time = parsed.get("time")
            item_name = str(parsed.get("item_name") or "").strip()
            name = item_name or (
                "รายการจากใบเสร็จ" if parsed.get("document_type") == "receipt"
                else "รายการจากสลิป"
            )
            note = parsed.get("note") or {}
            category = (
                match_category(item_name, "expense", request.user, rule_category="อื่นๆ")
                if item_name else None
            ) or fallback_category("expense", request.user)
            return Response({
                "date": date,
                "time": time,
                "transaction_datetime": f"{date} {time or ''}".strip() if date else None,
                "amount": parsed.get("amount"),
                "name": name[:200],
                "item_name": parsed.get("item_name"),
                "category": category.pk if category else None,
                "note": note,
                "memo": str(note.get("memo") or "")[:100],
                "needs_review": parsed.get("needs_review", True) or category is None,
                "review_reasons": parsed.get("review_reasons") or [],
                "ocr_text": parsed.get("ocr_text") or [],
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
        from finhealth.scoring import (
            get_period, segments, income_for_period, percent, score_eir, mean, score, rounded
        )
        from django.utils import timezone
        from datetime import datetime, time, timedelta
        start, end, is_transition = get_period(request.user)
        today = timezone.localdate()
        evaluation_end = min(end, today)
        expense_total = (Transaction.objects.filter(
            user=request.user, transaction_type="expense",
            transaction_date__gte=start, transaction_date__lte=evaluation_end
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0"))
        salary, transaction_income, total_income = income_for_period(
            request.user, start, evaluation_end
        )
        eir = percent(expense_total, total_income)
        eir_score = score_eir(eir)

        # TRC is based on recording timestamps, not transaction_date.
        start_dt = timezone.make_aware(datetime.combine(start, time.min))
        end_dt = timezone.make_aware(datetime.combine(evaluation_end + timedelta(days=1), time.min))
        entries = Transaction.objects.filter(
            user=request.user, created_at__gte=start_dt, created_at__lt=end_dt
        ).values("created_at", "transaction_type")
        daily = {}
        for entry in entries:
            recorded_date = timezone.localtime(entry["created_at"]).date()
            item = daily.setdefault(recorded_date, {
                "date": recorded_date.isoformat(), "day": (recorded_date-start).days+1,
                "income_count": 0, "expense_count": 0
            })
            item[f'{entry["transaction_type"]}_count'] += 1
        recorded_days = len(daily)
        periods = []
        recorded_periods = 0
        for number, period_start, period_end in segments(start, end):
            recorded = sorted(
                (d for d in daily if period_start <= d <= min(period_end, evaluation_end))
            )
            if recorded: recorded_periods += 1
            periods.append({
                "period": number, "start_day": (period_start-start).days+1,
                "end_day": (period_end-start).days+1,
                "start_date": period_start.isoformat(), "end_date": period_end.isoformat(),
                "recorded_days": [(d-start).days+1 for d in recorded],
                "has_records": bool(recorded)
            })
        rf = score(Decimal(recorded_days)*100/8)
        rd = rounded(Decimal(recorded_periods)*100/4)
        trc = mean(rf,rd)
        return Response({
            "year": start.year, "month": start.month,
            "period_start": start, "period_end": end,
            "evaluation_end": evaluation_end, "is_transition": is_transition,
            "is_provisional": today < end,
            "expense_total": expense_total, "transaction_income_total": transaction_income,
            "monthly_income": salary, "net_monthly_income": total_income,
            "expense_ratio": eir, "eir_score": eir_score,
            "trc_days_evaluated": (evaluation_end-start).days+1,
            "trc_days_in_month": (end-start).days+1,
            "trc_recorded_days": recorded_days, "trc_recording_frequency": rf,
            "trc_recorded_periods": recorded_periods, "trc_total_periods": 4,
            "trc_recording_distribution": rd, "trc_score": trc,
            "spend_score": mean(eir_score,trc),
            "trc_daily_records": sorted(daily.values(),key=lambda x:x["day"]),
            "trc_periods": periods
        })
