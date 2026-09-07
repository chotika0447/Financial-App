from django.contrib import admin
from .models import User


@admin.register(User)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'email',
        'username',
        'is_active',
        'is_staff',
        'created_at',
    )

    search_fields = (
        'email',
        'username',
    )

    ordering = ('id',)