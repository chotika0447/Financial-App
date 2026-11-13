from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import Savings
from .serializers import SavingsSerializer

class SavingsListCreateView(APIView):
    #แสดงรายการการออมทั้งหมด
    permission_classes = [IsAuthenticated]
    #ดึงแค่ของผู้ใช้ที่เข้าสู่ระบบอยู่
    def get(self, request):
        savings = Savings.objects.filter(
            user=request.user
        ).order_by(
            "-created_at", 
            "-updated_at", 
            "-saving_id"
        )
        serializer = SavingsSerializer(
            savings, 
            many=True
        )
        return Response(serializer.data)
    
    #สร้างกระเป๋าใหม่
    def post(self, request):
        serializer = SavingsSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(
                user=request.user
            )
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED)
        return Response(
            serializer.errors, 
            status=status.HTTP_400_BAD_REQUEST)

#ดู / แก้ไข / ลบ การออม 1 รายการ
class SavingsDetailView(APIView):

    permission_classes = [IsAuthenticated]

    #ดึงข้อมูลการออมตาม ID
    def get_object(self, pk):
        try:
            return Savings.objects.get(
                saving_id=pk, 
                user=self.request.user)
        except Savings.DoesNotExist:
            return None

    #แสดงรายละเอียดการออม 1 รายการ
    def get(self, request, pk):
        saving = self.get_object(pk)
        if saving is None:
            return Response({"error": "ไม่พบรายการการออม"}, 
            status=status.HTTP_404_NOT_FOUND)
        serializer = SavingsSerializer(saving)
        return Response(serializer.data)

    #แก้ไขรายละเอียดการออม 1 รายการ
    def put(self, request, pk):
        saving = self.get_object(pk)
        if saving is None:
            return Response({"error": "ไม่พบรายการการออม"}, status=status.HTTP_404_NOT_FOUND)
        serializer = SavingsSerializer(
            saving, 
            data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    #ลบรายการการออม 1 รายการ
    def delete(self, request, pk):
        saving = self.get_object(pk)
        if saving is None:
            return Response({"error": "ไม่พบรายการการออม"}, status=status.HTTP_404_NOT_FOUND)
        saving.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
