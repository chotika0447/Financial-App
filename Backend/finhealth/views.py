
from calendar import monthrange
from datetime import date, timedelta

from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import FinancialCycleSetting, FinancialPeriod


def month_day(year, month, day):
    last_day = monthrange(year, month)[1]
    return date(year, month, min(day, last_day))


def next_month(year, month):
    if month == 12:
        return year + 1, 1
    return year, month + 1


def next_start_after(current_date, day):
    year, month = current_date.year, current_date.month

    candidate = month_day(year, month, day)

    if candidate <= current_date:
        year, month = next_month(year, month)
        candidate = month_day(year, month, day)

    return candidate


class FinancialCycleView(APIView):

    def get(self, request):
        setting, _ = FinancialCycleSetting.objects.get_or_create(
            user=request.user
        )

        today = timezone.localdate()

        period = (
            FinancialPeriod.objects
            .filter(
                user=request.user,
                start_date__lte=today,
                end_date__gte=today
            )
            .order_by("-start_date")
            .first()
        )

        if period:
            start = period.start_date
            end = period.end_date
            is_transition = period.is_transition
        else:
            # ค่าเริ่มต้นสำหรับผู้ใช้ที่ยังไม่มีประวัติรอบ
            start = month_day(today.year, today.month, 1)
            year, month = next_month(today.year, today.month)
            end = month_day(year, month, 1) - timedelta(days=1)
            is_transition = False

        return Response({
            "start_day": setting.start_day,
            "period_start": start.isoformat(),
            "period_end": end.isoformat(),
            "is_transition": is_transition,
            "effective_from": (
                setting.effective_from.isoformat()
                if setting.effective_from else None
            )
        })

    def patch(self, request):
        try:
            start_day = int(request.data.get("start_day"))
        except (TypeError, ValueError):
            return Response(
                {"detail": "start_day must be an integer."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not 1 <= start_day <= 31:
            return Response(
                {"detail": "start_day must be between 1 and 31."},
                status=status.HTTP_400_BAD_REQUEST
            )

        setting, _ = FinancialCycleSetting.objects.get_or_create(
            user=request.user
        )

        today = timezone.localdate()

        current_period = (
            FinancialPeriod.objects
            .filter(
                user=request.user,
                start_date__lte=today,
                end_date__gte=today
            )
            .first()
        )

        if current_period:
            current_end = current_period.end_date
        else:
            year, month = next_month(today.year, today.month)
            current_end = (
                month_day(year, month, 1)
                - timedelta(days=1)
            )

        new_cycle_start = next_start_after(
            current_end, start_day
        )

        setting.start_day = start_day
        setting.effective_from = new_cycle_start
        setting.save()

        return Response({
            "start_day": setting.start_day,
            "new_cycle_start": new_cycle_start.isoformat(),
            "message": "Cycle setting saved."
        })
