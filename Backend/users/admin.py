from django.contrib import admin
from .models import User, PersonalProfile


@admin.register(User)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = (
        'uid',
        'username',
        'line_uid',
        'is_active',
        'created_at',
        'updated_at',
    )
    search_fields = (
        'uid',
        'username',
        'line_uid',
    )
    ordering = ('uid',)


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



