
from calendar import monthrange
from datetime import date, timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

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


def previous_month(year, month):
    if month == 1:
        return year - 1, 12
    return year, month - 1


def current_cycle_dates(today, start_day):
    start = month_day(today.year, today.month, start_day)

    if start > today:
        year, month = previous_month(today.year, today.month)
        start = month_day(year, month, start_day)

    end = next_start_after(start, start_day) - timedelta(days=1)
    return start, end


def find_current_period(user, today):
    return (
        FinancialPeriod.objects
        .filter(
            user=user,
            start_date__lte=today,
            end_date__gte=today
        )
        .order_by("-start_date")
        .first()
    )


def ensure_current_period(user, today):
    period = find_current_period(user, today)

    if period:
        return period

    # ยังไม่มีรอบที่ครอบคลุมวันนี้:
    # ตรวจสอบว่ามีการตั้งค่าที่เริ่มมีผลแล้วหรือไม่
    setting, _ = FinancialCycleSetting.objects.get_or_create(
        user=user
    )

    if setting.effective_from and today < setting.effective_from:
        # ระหว่างรอใช้ค่าใหม่ ไม่ควรสร้างรอบย้อนหลังเอง
        raise ValueError(
            "ไม่พบรอบการเงินปัจจุบัน กรุณาตรวจสอบข้อมูลรอบการเงิน"
        )

    start, end = current_cycle_dates(today, setting.start_day)

    # ป้องกันการสร้างรอบที่ซ้อนกับประวัติเดิม
    overlaps = FinancialPeriod.objects.filter(
        user=user,
        start_date__lte=end,
        end_date__gte=start
    ).exists()

    if overlaps:
        raise ValueError(
            "พบช่วงรอบการเงินซ้อนทับกัน กรุณาตรวจสอบข้อมูลเดิม"
        )

    return FinancialPeriod.objects.create(
        user=user,
        start_date=start,
        end_date=end,
        is_transition=False
    )


def cycle_response(setting, period):
    return {
        "start_day": setting.start_day,
        "period_start": period.start_date.isoformat(),
        "period_end": period.end_date.isoformat(),
        "is_transition": period.is_transition,
        "effective_from": (
            setting.effective_from.isoformat()
            if setting.effective_from else None
        ),
    }


class FinancialCycleView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()

        try:
            with transaction.atomic():
                setting, _ = FinancialCycleSetting.objects.get_or_create(
                    user=request.user
                )

                period = ensure_current_period(
                    request.user, today
                )

                data = cycle_response(setting, period)

            return Response(data)

        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_409_CONFLICT
            )

    def patch(self, request):
        raw_day = request.data.get("start_day")

        if isinstance(raw_day, bool) or not (
            isinstance(raw_day, int)
            or (
                isinstance(raw_day, str)
                and raw_day.isdecimal()
            )
        ):
            return Response(
                {"detail": "กรุณาเลือกวันที่ 1–31"},
                status=status.HTTP_400_BAD_REQUEST
            )

        start_day = int(raw_day)

        if not 1 <= start_day <= 31:
            return Response(
                {"detail": "วันเริ่มรอบต้องอยู่ระหว่าง 1–31"},
                status=status.HTTP_400_BAD_REQUEST
            )

        today = timezone.localdate()

        try:
            with transaction.atomic():
                setting, _ = FinancialCycleSetting.objects.get_or_create(
                    user=request.user
                )

                setting = (
                    FinancialCycleSetting.objects
                    .select_for_update()
                    .get(pk=setting.pk)
                )

                current_period = ensure_current_period(
                    request.user, today
                )

                # หากมีการเปลี่ยนค่าที่รอมีผลอยู่
                # ยังไม่อนุญาตให้เปลี่ยนซ้ำในเวอร์ชันนี้
                if (
                    setting.effective_from
                    and setting.effective_from > today
                ):
                    if start_day == setting.start_day:
                        return Response({
                            **cycle_response(setting, current_period),
                            "new_cycle_start": (
                                setting.effective_from.isoformat()
                            ),
                            "message": "การตั้งค่านี้ถูกบันทึกไว้แล้ว"
                        })

                    return Response(
                        {
                            "detail": (
                                "มีการตั้งค่าวันเริ่มรอบใหม่ที่รอมีผลอยู่ "
                                "กรุณารอจนถึงรอบใหม่ก่อนเปลี่ยนอีกครั้ง"
                            )
                        },
                        status=status.HTTP_409_CONFLICT
                    )

                # วันเดียวกับรอบปัจจุบัน ไม่จำเป็นต้องสร้างรอบใหม่
                if start_day == current_period.start_date.day:
                    setting.start_day = start_day
                    setting.effective_from = None
                    setting.save()

                    return Response({
                        **cycle_response(setting, current_period),
                        "new_cycle_start": None,
                        "message": "บันทึกวันเริ่มรอบการเงินสำเร็จ"
                    })

                # รอบใหม่เริ่มหลังรอบปัจจุบันสิ้นสุด
                next_day = current_period.end_date + timedelta(days=1)
                new_start = next_start_after(
                    current_period.end_date, start_day
                )

                # ตรวจสอบช่วงที่กำลังจะสร้าง
                next_end = (
                    next_start_after(new_start, start_day)
                    - timedelta(days=1)
                )

                overlaps = FinancialPeriod.objects.filter(
                    user=request.user,
                    start_date__lte=next_end,
                    end_date__gte=next_day
                ).exists()

                if overlaps:
                    return Response(
                        {
                            "detail": (
                                "มีรอบการเงินในอนาคตอยู่แล้ว "
                                "กรุณาตรวจสอบก่อนเปลี่ยนวันเริ่มรอบ"
                            )
                        },
                        status=status.HTTP_409_CONFLICT
                    )

                # สร้างรอบเปลี่ยนผ่าน หากมีช่องว่าง
                if next_day < new_start:
                    FinancialPeriod.objects.create(
                        user=request.user,
                        start_date=next_day,
                        end_date=new_start - timedelta(days=1),
                        is_transition=True
                    )

                # สร้างรอบปกติรอบแรกตามวันใหม่
                FinancialPeriod.objects.create(
                    user=request.user,
                    start_date=new_start,
                    end_date=next_end,
                    is_transition=False
                )

                setting.start_day = start_day
                setting.effective_from = new_start
                setting.save()

                return Response({
                    **cycle_response(setting, current_period),
                    "new_cycle_start": new_start.isoformat(),
                    "message": "บันทึกวันเริ่มรอบการเงินสำเร็จ"
                })

        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_409_CONFLICT
            )
