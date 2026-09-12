from django.db.models import Sum, Q  # ดึงเครื่องมือคำนวณยอดรวม (Sum) และเงื่อนไขขั้นสูง (Q) ของ Django ORM
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated  # เครื่องมือบังคับต้อง Login ก่อนใช้งาน
from rest_framework.decorators import action  # Decorator สำหรับสร้าง API Custom Endpoint เพิ่มเติม
from rest_framework.response import Response

from .models import Transaction
from .serializers import TransactionSerializer


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]  # ล็อค API นี้เฉพาะผู้ใช้ที่แนบ Bearer Token (Login แล้ว) เท่านั้น

    def get_queryset(self):
        """
        ระบบ Data Isolation: กรองข้อมูลให้เห็นเฉพาะรายการของ User คนที่ล็อกอินอยู่
        พร้อมเรียงลำดับจากวันที่ล่าสุด (-transaction_date) และ ID ล่าสุด (-id)
        """
        return Transaction.objects.filter(
            user=self.request.user
        ).order_by('-transaction_date', '-id')

    def perform_create(self, serializer):
        """
        ยัดข้อมูล user=request.user ให้อัตโนมัติในขั้นตอนสร้างข้อมูล (POST)
        ป้องกันไม่ให้ฝั่ง Client แอบส่ง user_id ของคนอื่นเข้ามาผูกข้อมูล
        """
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """
        Custom API Endpoint: GET /api/transactions/summary/
        ทำหน้าที่สรุปผลรวมรายรับ รายจ่าย และยอดเงินคงเหลือของผู้ใช้
        """
        
        # 1. ยิงคำสั่ง Aggregate ไปที่ Supabase/PostgreSQL ให้ฐานข้อมูลรวมยอดให้โดยตรง
        #    - total_income: รวมคอลัมน์ amount เฉพาะอันที่ transaction_type == 'Income'
        #    - total_expense: รวมคอลัมน์ amount เฉพาะอันที่ transaction_type == 'Expense'
        totals = self.get_queryset().aggregate(
            total_income=Sum(
                'amount',
                filter=Q(transaction_type='Income')
            ),
            total_expense=Sum(
                'amount',
                filter=Q(transaction_type='Expense')
            )
        )

        # 2. ป้องกันกรณี User ยังไม่มีข้อมูล (จะคืนค่า None) ให้สลับไปใช้ค่า 0 แทน
        total_income = totals['total_income'] or 0
        total_expense = totals['total_expense'] or 0

        # 3. คำนวณยอดเงินคงเหลือสุทธิ (รายรับ - รายจ่าย)
        balance = total_income - total_expense

        # 4. ส่งผลลัพธ์กลับเป็น JSON ให้ฝั่ง Frontend ใช้งาน
        return Response({
            'total_income': total_income,
            'total_expense': total_expense,
            'balance': balance,
        }, status=status.HTTP_200_OK)