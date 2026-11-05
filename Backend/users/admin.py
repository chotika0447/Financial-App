
import json

from django.contrib import admin
from django.db.models import Count, Avg, Case, When, Value, CharField
from django.urls import path, reverse
from django.shortcuts import render

from .models import User, PersonalProfile


@admin.register(PersonalProfile)
class PersonalProfileAdmin(admin.ModelAdmin):
    list_display = (
        'profile_id',
        'user',
        'age',
        'occupation',
        'monthly_income',
        'updated_at',
    )

    list_select_related = ('user',)
    search_fields = ('user__username', 'user__uid', 'occupation', 'email')
    list_filter = ('occupation',)

    change_list_template = 'admin/users/personalprofile/change_list.html'

    def get_urls(self):
        urls = super().get_urls()

        custom_urls = [
            path(
                'dashboard/',
                self.admin_site.admin_view(self.dashboard_view),
                name='users_personalprofile_dashboard',
            ),
        ]

        return custom_urls + urls

    def dashboard_view(self, request):
        # จำนวนผู้ใช้ทั้งหมด
        total_users = User.objects.count()

        # จำนวนผู้ใช้ที่มี PersonalProfile
        total_profiles = PersonalProfile.objects.count()

        # จำนวนผู้ใช้ที่ยังไม่มี PersonalProfile
        missing_profiles = User.objects.filter(
            personal_profile__isnull=True
        ).count()

        # รายได้เฉลี่ยต่อเดือน
        average_income = (
            PersonalProfile.objects.aggregate(
                average=Avg('monthly_income')
            )['average'] or 0
        )

        # ------------------ Age Groups ------------------
        age_data = (
            PersonalProfile.objects
            .annotate(
                age_group=Case(
                    When(age__isnull=True, then=Value('ไม่ระบุ')),
                    When(age__lt=20, then=Value('ต่ำกว่า 20 ปี')),
                    When(age__gte=20, age__lt=30, then=Value('20–29 ปี')),
                    When(age__gte=30, age__lt=40, then=Value('30–39 ปี')),
                    When(age__gte=40, age__lt=50, then=Value('40–49 ปี')),
                    When(age__gte=50, then=Value('50 ปีขึ้นไป')),
                    output_field=CharField(),
                )
            )
            .values('age_group')
            .annotate(total=Count('profile_id'))
            .order_by('age_group')
        )

        # ------------------ Occupation ------------------
        occupation_data = (
            PersonalProfile.objects
            .annotate(
                occupation_group=Case(
                    When(
                        occupation__isnull=True,
                        then=Value('ไม่ระบุ')
                    ),
                    When(
                        occupation='',
                        then=Value('ไม่ระบุ')
                    ),
                    default='occupation',
                    output_field=CharField(),
                )
            )
            .values('occupation_group')
            .annotate(total=Count('profile_id'))
            .order_by('-total')
        )

        # ------------------ Monthly Income ------------------
        income_data = (
            PersonalProfile.objects
            .annotate(
                income_group=Case(
                    When(
                        monthly_income__lte=0,
                        then=Value('ไม่มีรายได้')
                    ),
                    When(
                        monthly_income__gt=0,
                        monthly_income__lt=10000,
                        then=Value('1–9,999 บาท')
                    ),
                    When(
                        monthly_income__gte=10000,
                        monthly_income__lt=20000,
                        then=Value('10,000–19,999 บาท')
                    ),
                    When(
                        monthly_income__gte=20000,
                        monthly_income__lt=30000,
                        then=Value('20,000–29,999 บาท')
                    ),
                    When(
                        monthly_income__gte=30000,
                        monthly_income__lt=50000,
                        then=Value('30,000–49,999 บาท')
                    ),
                    When(
                        monthly_income__gte=50000,
                        then=Value('50,000 บาทขึ้นไป')
                    ),
                    output_field=CharField(),
                )
            )
            .values('income_group')
            .annotate(total=Count('profile_id'))
            .order_by('income_group')
        )

        context = {
            **self.admin_site.each_context(request),
            'title': 'Dashboard สรุปข้อมูลผู้ใช้งาน',

            'total_users': total_users,
            'total_profiles': total_profiles,
            'missing_profiles': missing_profiles,
            'average_income': float(average_income),

            'age_chart_data': json.dumps(list(age_data), ensure_ascii=False),
            'occupation_chart_data': json.dumps(
                list(occupation_data), ensure_ascii=False
            ),
            'income_chart_data': json.dumps(
                list(income_data), ensure_ascii=False
            ),

            'opts': self.model._meta,
        }

        return render(
            request,
            'admin/users/personalprofile/dashboard.html',
            context,
        )
