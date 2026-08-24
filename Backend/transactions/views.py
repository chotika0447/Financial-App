from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import Transaction
from .serializers import TransactionSerializer

#view transaction ทั้งหมดของ user ที่ login อยู่
class TransactionListCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        #.objects.filter() — เป็นคำสั่งค้นหาค่าใน Database ที่มีหลายค่าที่ตรงกับเงื่อนไข
        transactions = Transaction.objects.filter(
            user=request.user
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
#view ของ 1 transaction
class TransactionDetailView(APIView):

    permission_classes = [IsAuthenticated]

    #ใช้ค้นหา transaction ให้ตรงกับ request.user และ pk ที่ส่งเข้ามา ป้องกันการดู transaction ของคนอื่น
    def get_object(self, request, pk):
        #.objects.get() — เป็นคำสั่งค้นหาค่าใน Database ที่มีค่าเดียว
        try:
            return Transaction.objects.get(
                id=pk,
                user=request.user
            )

        except Transaction.DoesNotExist:
            return None

    def get(self, request, pk):

        transaction = self.get_object(request, pk)

        if transaction is None:
            return Response(
                {'error': 'Transaction not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TransactionSerializer(transaction)

        return Response(serializer.data)

    def put(self, request, pk):

        transaction = self.get_object(request, pk)

        if transaction is None:
            return Response(
                {'error': 'Transaction not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TransactionSerializer(
            transaction,
            data=request.data
        )

        if serializer.is_valid():

            transaction = serializer.save()

            return Response(
                TransactionSerializer(transaction).data
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, pk):

        transaction = self.get_object(request, pk)

        if transaction is None:
            return Response(
                {'error': 'Transaction not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        transaction.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )