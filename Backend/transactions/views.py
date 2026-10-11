from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import Transaction
from .serializers import TransactionSerializer

from rest_framework.parsers import MultiPartParser, FormParser
from PIL import UnidentifiedImageError

from .ocr import read_receipt, get_receipt_amount, extract_datetime

# ดู Transaction ทั้งหมด
# และเพิ่ม Transaction ใหม่
class TransactionListCreateView(APIView):

    permission_classes = [IsAuthenticated]


    # ดู Transaction
    def get(self, request):

        # เอาเฉพาะ Transaction ของ User ที่ Login อยู่
        transactions = Transaction.objects.filter(
            user=request.user
        ).order_by(
            "-transaction_date",
            "-transaction_time",
            "-created_at",
            "-id"
        )


        # เช่น
        # /transactions/?transaction_type=expense
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


        return Response(
            serializer.data
        )


    # เพิ่ม Transaction
    def post(self, request):

        serializer = TransactionSerializer(
            data=request.data
        )


        if serializer.is_valid():

            transaction = serializer.save(
                user=request.user
            )


            return Response(
                TransactionSerializer(transaction).data,
                status=status.HTTP_201_CREATED
            )


        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )



# ดู / แก้ไข / ลบ Transaction 1 รายการ
class TransactionDetailView(APIView):

    permission_classes = [IsAuthenticated]


    # หา Transaction ตาม ID
    def get_object(self, request, pk):

        try:

            return Transaction.objects.get(
                id=pk,
                user=request.user
            )

        except Transaction.DoesNotExist:

            return None


    # ดู Transaction 1 รายการ
    def get(self, request, pk):

        transaction = self.get_object(
            request,
            pk
        )


        if transaction is None:

            return Response(
                {
                    "error": "Transaction not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )


        serializer = TransactionSerializer(
            transaction
        )


        return Response(
            serializer.data
        )


    # แก้ทั้งหมด
    def put(self, request, pk):

        return self.update(
            request,
            pk,
            partial=False
        )


    # แก้บางส่วน
    def patch(self, request, pk):

        return self.update(
            request,
            pk,
            partial=True
        )


    # ใช้ร่วมกันระหว่าง PUT กับ PATCH
    def update(self, request, pk, partial):

        transaction = self.get_object(
            request,
            pk
        )


        if transaction is None:

            return Response(
                {
                    "error": "Transaction not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )


        serializer = TransactionSerializer(
            transaction,
            data=request.data,
            partial=partial
        )


        if serializer.is_valid():

            transaction = serializer.save()


            return Response(
                TransactionSerializer(
                    transaction
                ).data
            )


        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


    # ลบ Transaction
    def delete(self, request, pk):

        transaction = self.get_object(
            request,
            pk
        )


        if transaction is None:

            return Response(
                {
                    "error": "Transaction not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )


        transaction.delete()


        return Response(
            status=status.HTTP_204_NO_CONTENT
        )
        

# อ่านข้อมูลจากรูปใบเสร็จหรือสลิป
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

        try:
            # OCR อ่านไฟล์ที่อัปโหลดโดยตรง
            text = read_receipt(image)

            # ดึงยอดเงินและวันที่
            amount, amount_status = get_receipt_amount(text)
            transaction_datetime = extract_datetime(text)

            return Response({
                "amount": amount,
                "amount_status": amount_status,
                "transaction_datetime": transaction_datetime,
                "raw_text": text,
                "requires_confirmation": True
            })

        except (UnidentifiedImageError, OSError):
            return Response(
                {"error": "ไม่สามารถอ่านไฟล์รูปภาพได้"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception:
            return Response(
                {"error": "เกิดข้อผิดพลาดในการประมวลผล OCR"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
