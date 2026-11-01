from django.contrib import admin
from .models import Category, Brand, UserKeyword


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("keyword", "category", "transaction_type")
    search_fields = ("keyword", "category__name")
    list_filter = ("transaction_type",)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("category")

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "category":
            kwargs["queryset"] = Category.objects.filter(user__isnull=True)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        if obj.category.user_id is not None or obj.category.transaction_type != obj.transaction_type:
            from django.core.exceptions import ValidationError
            raise ValidationError("Brand must reference a global category of the same type")
        super().save_model(request, obj, form, change)


@admin.register(UserKeyword)
class UserKeywordAdmin(admin.ModelAdmin):
    list_display = ("user", "keyword", "category", "transaction_type")
    search_fields = ("keyword", "user__email", "category__name")
    list_filter = ("transaction_type",)
