from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from datetime import date
from decimal import Decimal

from django.utils import timezone
from django.db.models import Sum

from transactions.models import Transaction
from savings.models import Savings
from debts.models import Debts

class DashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        month_params = request.query_params.get('month')
        if month_params:
            try:
                year,month = map(int, month_params.split('-'))

                if not 1 <= month <= 12:
                    raise ValueError("Invalid month value")

                start_date = datetime(year, month, 1)
            except (ValueError, TypeError):
                return Response(
                    {'detail': 'รูปแบบเดือนไม่ถูกต้อง (ควรเป็น YYYY-MM)'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            today = timezone.localdate()
            start_date = date(today.year, today.month, 1)

        #กำหนดวันเริ่มต้นของเดือนถัดไป
        if start_date.month == 12:
            next_month = date(start_date.year + 1, 1, 1)
        else:
            next_month = date(start_date.year, start_date.month + 1, 1)

        #สรุปยอดรายรับและรายจ่าย
        transactions = Transaction.objects.filter(
            user=user,
            transaction_date__gte=start_date,
            transaction_date__lt=next_month
        )

        income = transactions.filter(transaction_type='income').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        expense = transactions.filter(transaction_type='expense').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        #สรุปยอดเงินออม
        savings = Savings.objects.filter(user=user)
        wallet_balance = savings.aggregate(total=Sum('balance'))['total'] or Decimal('0.00')
        wallet_target = savings.aggregate(total=Sum('target'))['total'] or Decimal('0.00')
        active_wallet = savings.filter(status='active').count()

        #สรุปยอดหนี้ที่ดำเนินการอยู่
        ongoing_debts = Debts.objects.filter(user=user, status='ongoing')
        borrowed = ongoing_debts.filter(type='borrowed').aggregate(total=Sum('remaining_amount'))['total'] or Decimal('0.00')
        lent = ongoing_debts.filter(type='lent').aggregate(total=Sum('remaining_amount'))['total'] or Decimal('0.00')

        return Response({
            'month' : start_date.strftime('%Y-%m'),
            'income' : income,
            'expense' : expense,
            'balance' : income-expense,
            'wallet_balance' : wallet_balance,
            'wallet_target' : wallet_target,
            'active_wallet' : active_wallet,
            'borrowed_remaining' : borrowed,
            'lent_remaining' : lent
        }) 