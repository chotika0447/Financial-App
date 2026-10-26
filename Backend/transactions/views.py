import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from django.db import transaction
from django.utils import timezone

from PIL import UnidentifiedImageError

from .services import confirm_transaction_draft
from .models import Transaction, TransactionDraft
from .serializers import TransactionSerializer, TransactionDraftSerializer
from .ocr import (
    read_receipt_data,
    get_receipt_amount,
    extract_datetime,
)


logger = logging.getLogger(__name__)


# ดูรายการรายรับ-รายจ่ายทั้งหมด และเพิ่มรายการใหม่
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

    # เพิ่มรายการรายรับ-รายจ่าย
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


# ดู แก้ไข และลบรายการที่บันทึกแล้ว
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

            return Response(
                TransactionSerializer(transaction_item).data
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, pk):

        transaction_item = self.get_object(request, pk)

        if transaction_item is None:
            return Response(
                {"error": "Transaction not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        transaction_item.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


# อ่านยอดเงินและวันที่จากรูปสลิปหรือใบเสร็จ
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

        if image.content_type not in ["image/jpeg", "image/png"]:
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
            image.content_type,
        )

        try:
            logger.info("Receipt OCR: starting read_receipt_data")
            receipt_data = read_receipt_data(image)
            logger.info("Receipt OCR: read_receipt_data completed")

            text = receipt_data["raw_text"]
            parsed = receipt_data["parsed"]

            amount, amount_status = get_receipt_amount(text)
            transaction_datetime = (
                extract_datetime(text) or parsed.get("date")
            )

            note_data = parsed.get("note") or {}
            memo = note_data.get("memo") if isinstance(note_data, dict) else None

            logger.info(
                "Receipt OCR: parsing completed amount_status=%s date_found=%s",
                amount_status,
                bool(transaction_datetime),
            )

            return Response({
                "amount": amount,
                "amount_status": amount_status,
                "transaction_datetime": transaction_datetime,
                "memo": memo,
                "raw_text": text,
                "requires_confirmation": True,
            })

        except (UnidentifiedImageError, OSError):
            logger.exception("Receipt OCR: invalid or unreadable image")
            return Response(
                {"error": "ไม่สามารถอ่านไฟล์รูปภาพได้"},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception:
            logger.exception("Receipt OCR processing failed")
            return Response(
                {"error": "เกิดข้อผิดพลาดในการประมวลผล OCR"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ดูและแก้ไขรายการร่างจาก LINE OA
class TransactionDraftDetailView(APIView):

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    # ค้นหารายการร่างของผู้ใช้
    def get_draft(self, request, pk):

        try:
            return TransactionDraft.objects.get(
                id=pk,
                user=request.user
            )

        except TransactionDraft.DoesNotExist:
            return None

    # ดูข้อมูลรายการร่าง
    def get(self, request, pk):

        draft = self.get_draft(request, pk)

        if draft is None:
            return Response(
                {"error": "ไม่พบรายการร่าง"},
                status=status.HTTP_404_NOT_FOUND
            )

        if draft.status != "pending":
            return Response(
                {"error": "รายการนี้ไม่ได้อยู่ในสถานะรอยืนยัน"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = TransactionDraftSerializer(draft)

        return Response(serializer.data)

    # แก้ไขรายการร่าง
    def patch(self, request, pk):

        with transaction.atomic():

            try:
                draft = TransactionDraft.objects.select_for_update().get(
                    id=pk,
                    user=request.user
                )

            except TransactionDraft.DoesNotExist:
                return Response(
                    {"error": "ไม่พบรายการร่าง"},
                    status=status.HTTP_404_NOT_FOUND
                )

            if draft.status != "pending":
                return Response(
                    {"error": "ไม่สามารถแก้ไขรายการนี้ได้"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer = TransactionDraftSerializer(
                draft,
                data=request.data,
                partial=True
            )

            if not serializer.is_valid():
                return Response(
                    serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST
                )

            # ตรวจสอบหมวดหมู่ให้ตรงกับประเภท
            new_type = serializer.validated_data.get(
                "transaction_type",
                draft.transaction_type
            )

            new_category = serializer.validated_data.get(
                "category",
                draft.category
            )

            if new_category is not None:
                if new_category.transaction_type != new_type:
                    return Response(
                        {"error": "หมวดหมู่ไม่ตรงกับประเภทรายการ"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            serializer.save()

            return Response(serializer.data)


# ยืนยันรายการร่างและบันทึก Transaction จริง

# ยืนยันรายการร่างจากเว็บไซต์
class TransactionDraftConfirmView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):

        new_transaction, error = confirm_transaction_draft(
            draft_id=pk,
            user=request.user
        )

        if error:
            return Response(
                {"error": error},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "message": "บันทึกรายการสำเร็จ",
                "transaction_id": new_transaction.id
            },
            status=status.HTTP_201_CREATED
        )
