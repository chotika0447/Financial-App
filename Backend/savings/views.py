from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import Savings, SavingsTransaction
from .serializers import SavingsSerializer, SavingsTransactionSerializer

from decimal import Decimal, InvalidOperation

from django.db.models import Sum
from django.utils import timezone
from datetime import date

from users.models import PersonalProfile
from transactions.models import Transaction

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

class SavingsBalanceActionView(APIView):
    permission_classes = [IsAuthenticated]
    action = None

    def post(self, request, pk):
        raw_amount = request.data.get("amount")

        try:
            amount = Decimal(str(raw_amount))
        except (InvalidOperation, TypeError, ValueError):
            return Response(
                {"error": "กรุณาระบุจำนวนเงินที่ถูกต้อง"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not amount.is_finite() or amount <= 0:
            return Response(
                {"error": "จำนวนเงินต้องมากกว่า 0"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if amount.as_tuple().exponent < -2:
            return Response(
                {"error": "รองรับทศนิยมไม่เกิน 2 ตำแหน่ง"},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            saving = (
                Savings.objects
                .select_for_update()
                .filter(saving_id=pk, user=request.user)
                .first()
            )

            if saving is None:
                return Response(
                    {"error": "ไม่พบรายการการออม"},
                    status=status.HTTP_404_NOT_FOUND
                )

            if self.action == "deposit":
                new_balance = saving.balance + amount

                if new_balance > Decimal("999999.99"):
                    return Response(
                        {"error": "ยอดเงินเกินขีดจำกัดที่ระบบรองรับ"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                saving.balance = new_balance
                transaction_type = SavingsTransaction.TransactionType.DEPOSIT

            elif self.action == "withdraw":
                if amount > saving.balance:
                    return Response(
                        {"error": "ยอดเงินไม่เพียงพอสำหรับการถอน"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                saving.balance -= amount
                transaction_type = SavingsTransaction.TransactionType.WITHDRAW

            else:
                return Response(
                    {"error": "ไม่รองรับการทำรายการนี้"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            #ตรวจว่ายอดเงินถึงเป้าหมายมั้ย
            if (
                saving.status == 'active' and
                saving.target > 0 and
                saving.balance >= saving.target
            ):
                saving.status = 'completed'
                saving.end_date = timezone.localdate()

            #อัปเดตยอดเงินในกระเป๋า
            saving.save(update_fields=["balance", "status", "end_date", "updated_at"])
            
            # บันทึกประวัติการฝาก/ถอน
            SavingsTransaction.objects.create(
                saving=saving,
                user=request.user,
                saving_name=saving.saving_name,
                transaction_type=transaction_type,
                amount=amount,
                balance_after=saving.balance,
            )

        # คืนข้อมูลในรูปแบบเดิม เพื่อไม่ให้กระทบ Frontend
        return Response(
            SavingsSerializer(saving).data,
            status=status.HTTP_200_OK
        )


class SavingsDepositView(SavingsBalanceActionView):
    action = "deposit"


class SavingsWithdrawView(SavingsBalanceActionView):
    action = "withdraw"


class SavingsTransactionListView (APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        transactions = SavingsTransaction.objects.filter(
            user=request.user
        ).select_related(
            "saving"
        ).order_by(
            "-transaction_date",
            "-created_at"
        )

        # กรองตามกระเป๋าได้ หากส่ง saving_id มา
        saving_id = request.query_params.get("saving_id")

        if saving_id:
            transactions = transactions.filter(
                saving_id=saving_id
            )

        serializer = SavingsTransactionSerializer(
            transactions,
            many=True
        )

        return Response(serializer.data)


class FinHealthWalletView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.localdate()

        # =====================================
        # 1. กำหนดช่วงเวลาประเมิน 3 เดือน
        # รวมเดือนปัจจุบัน
        # =====================================

        current_month_index = today.year * 12 + today.month - 1
        start_month_index = current_month_index - 2

        start_year, start_month_index_remainder = divmod(
            start_month_index, 12
        )

        period_start = date(
            start_year,
            start_month_index_remainder + 1,
            1
        )

        period_end = today

        # เตรียมข้อมูลรายเดือน
        monthly_data = {}

        for offset in range(3):
            month_index = start_month_index + offset
            year, month_remainder = divmod(month_index, 12)

            month_key = (year, month_remainder + 1)

            monthly_data[month_key] = {
                "year": year,
                "month": month_remainder + 1,
                "deposit": Decimal("0.00"),
                "withdraw": Decimal("0.00"),
                "net_saving": Decimal("0.00"),
            }

        # =====================================
        # 2. ดึงประวัติฝากถอนเงินในช่วงประเมิน
        # =====================================

        saving_transactions = (
            SavingsTransaction.objects
            .filter(
                user=user,
                transaction_date__gte=period_start,
                transaction_date__lte=period_end
            )
            .values(
                "transaction_date__year",
                "transaction_date__month",
                "transaction_type"
            )
            .annotate(total=Sum("amount"))
        )

        total_deposit = Decimal("0.00")
        total_withdraw = Decimal("0.00")

        for item in saving_transactions:
            month_key = (
                item["transaction_date__year"],
                item["transaction_date__month"]
            )

            amount = item["total"] or Decimal("0.00")

            if month_key not in monthly_data:
                continue

            if item["transaction_type"] == SavingsTransaction.TransactionType.DEPOSIT:
                monthly_data[month_key]["deposit"] += amount
                total_deposit += amount

            elif item["transaction_type"] == SavingsTransaction.TransactionType.WITHDRAW:
                monthly_data[month_key]["withdraw"] += amount
                total_withdraw += amount

        # =====================================
        # 3. คำนวณจำนวนเงินออมสุทธิ
        # =====================================

        total_saving = total_deposit - total_withdraw

        # =====================================
        # 4. คำนวณ Saving Consistency
        # =====================================

        sc_months = 0

        for data in monthly_data.values():
            data["net_saving"] = data["deposit"] - data["withdraw"]

            if data["net_saving"] > 0:
                sc_months += 1

        sc_period_months = 3

        saving_consistency = (
            Decimal(sc_months) /
            Decimal(sc_period_months) *
            Decimal("100")
        )

        # =====================================
        # 5. คำนวณรายได้สุทธิ
        # =====================================

        try:
            profile = PersonalProfile.objects.filter(user=user).first()
            monthly_income = (
                profile.monthly_income 
                if profile 
                else Decimal("0.00")
            )
        except PersonalProfile.DoesNotExist:
            monthly_income = Decimal("0.00")

        # รายได้จาก Transaction ในช่วงประเมิน
        income_result = Transaction.objects.filter(
            user=user,
            transaction_type=Transaction.TransactionType.INCOME,
            transaction_date__gte=period_start,
            transaction_date__lte=period_end
        ).aggregate(
            total=Sum("amount")
        )

        transaction_income = (
            income_result["total"] or Decimal("0.00")
        )

        # รายได้ประจำ 3 เดือน + รายได้ที่บันทึกเพิ่มเติม
        total_income = (
            monthly_income * Decimal("3") +
            transaction_income
        )

        # =====================================
        # 6. คำนวณ Saving Rate
        # =====================================

        if total_income > 0:
            saving_rate = (
                total_saving /
                total_income *
                Decimal("100")
            )
        else:
            saving_rate = None

        # =====================================
        # 7. เตรียมข้อมูลรายเดือนสำหรับ Frontend
        # =====================================

        monthly_breakdown = []

        for data in monthly_data.values():
            monthly_breakdown.append({
                "year": data["year"],
                "month": data["month"],
                "deposit": float(data["deposit"]),
                "withdraw": float(data["withdraw"]),
                "net_saving": float(data["net_saving"]),
            })

        # =====================================
        # 8. ส่งผลลัพธ์กลับไปยัง Frontend
        # =====================================

        return Response({
            "period_start": period_start,
            "period_end": period_end,

            # Saving Rate
            "total_deposit": float(total_deposit),
            "total_withdraw": float(total_withdraw),
            "total_saving": float(total_saving),

            "monthly_income": float(monthly_income),
            "transaction_income": float(transaction_income),
            "total_income": float(total_income),

            "saving_rate": (
                round(float(saving_rate), 2)
                if saving_rate is not None
                else None
            ),

            # Saving Consistency
            "sc_months": sc_months,
            "sc_period_months": sc_period_months,
            "saving_consistency": round(
                float(saving_consistency), 2
            ),

            # รายละเอียดรายเดือน
            "monthly_breakdown": monthly_breakdown,
        })
