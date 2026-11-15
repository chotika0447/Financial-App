from django.contrib import admin
from .models import Category, Brand


# These choices are shared with the frontend icon registry.
CATEGORY_ICON_CHOICES = [
    ("ellipsis", "อื่นๆ / จุดสามจุด"),
    ("utensils-crossed", "อาหาร"),
    ("coffee", "เครื่องดื่ม"),
    ("shopping-bag", "ช้อปปิ้ง"),
    ("car-front", "รถยนต์ / เดินทาง"),
    ("heart", "หัวใจ"),
    ("book-open", "การศึกษา"),
    ("wallet", "กระเป๋าเงิน"),
    ("gift", "ของขวัญ / โบนัส"),
    ("sparkles", "ความงาม"),
    ("briefcase-business", "งานเสริม"),
    ("banknote", "เงินเดือน"),
    ("trending-up", "ลงทุน"),
    ("phone", "โทรศัพท์"),
    ("house", "บ้าน / ค่าเช่า"),
    ("zap", "ค่าน้ำไฟ"),
    ("hand-heart", "ทำบุญ"),
    ("paw-print", "สัตว์เลี้ยง"),
]

from django import forms
from django.utils.html import format_html

# Inline SVG previews are bundled with the app (no CDN or extra package).
# Only preset, trusted SVG strings are used; user-provided SVG is never rendered.
ICON_SVG_PATHS = {
    'ellipsis': '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    'utensils-crossed': '<path d="m16 2-7 7 6 6 7-7"/><path d="m8 2 4 4-6 6-4-4"/><path d="m2 22 8-8"/><path d="m14 14 8 8"/>',
    'coffee': '<path d="M10 2v2M14 2v2"/><path d="M4 7h14v8a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6z"/><path d="M18 9h2a3 3 0 0 1 0 6h-2"/>',
    'shopping-bag': '<path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
    'car-front': '<path d="m5 17-1 4h3l1-3m9-1 1 4h3l-1-4"/><path d="m5 17-1-5 2-6h12l2 6-1 5z"/><path d="M4 12h16M7 15h.01M17 15h.01"/>',
    'heart': '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
    'book-open': '<path d="M12 7c-3-2-6-2-10-1v14c4-1 7-1 10 1 3-2 6-2 10-1V6c-4-1-7-1-10 1z"/><path d="M12 7v14"/>',
    'wallet': '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M16 14h5"/><circle cx="16" cy="14" r=".5"/>',
    'gift': '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M12 9v12M3 13h18M3 9V6h18v3"/><path d="M12 6C7 6 6 4 7 2c2-2 5 2 5 4zm0 0c5 0 6-2 5-4-2-2-5 2-5 4z"/>',
    'sparkles': '<path d="m12 3 1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9L12 3z"/><path d="m19 17 .6 1.4L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.6L19 17z"/>',
    'briefcase-business': '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13c5 3 13 3 18 0M12 12v3"/>',
    'banknote': '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9h.01M18 15h.01"/>',
    'trending-up': '<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
    'phone': '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    'house': '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10z"/><path d="M9 21v-8h6v8"/>',
    'zap': '<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
    'hand-heart': '<path d="M12 9c-2-3-6-2-6 1 0 3 6 6 6 6s6-3 6-6c0-3-4-4-6-1z"/><path d="M2 17h5l3 3h7l5-4-2-2-4 2"/>',
    'paw-print': '<circle cx="7" cy="7" r="1.4"/><circle cx="12" cy="5" r="1.4"/><circle cx="17" cy="7" r="1.4"/><circle cx="20" cy="11" r="1.2"/><path d="M12 11c-2 0-3 3-5 4-3 2-1 6 2 6 1.5 0 2-1 3-1s1.5 1 3 1c3 0 5-4 2-6-2-1-3-4-5-4z"/>',
}


class CategoryIconRadioSelect(forms.RadioSelect):
    def create_option(self, name, value, label, selected, index, subindex=None, attrs=None):
        option = super().create_option(name, value, label, selected, index, subindex, attrs)
        icon_path = ICON_SVG_PATHS.get(str(value), ICON_SVG_PATHS["ellipsis"])
        option["label"] = format_html(
            '<span class="category-icon-preview" aria-hidden="true">'
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{}</svg>'
            '</span><span class="category-icon-label">{}</span>',
            # Static trusted paths are HTML markup, not user input.
            mark_safe(icon_path), label,
        )
        return option


from django.utils.safestring import mark_safe


class CategoryAdminForm(forms.ModelForm):
    icon = forms.ChoiceField(
        choices=CATEGORY_ICON_CHOICES,
        label="ไอคอน",
        widget=CategoryIconRadioSelect,
    )

    class Meta:
        model = Category
        fields = ("name", "transaction_type", "icon")

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    form = CategoryAdminForm

    class Media:
        css = {"all": ("categories/css/category_icon_picker.css",)}
    list_display = ("name", "transaction_type", "icon")
    list_filter = ("transaction_type",)
    search_fields = ("name",)
    exclude = ("user",)

    def get_queryset(self, request):
        return super().get_queryset(request).filter(user__isnull=True)

    def save_model(self, request, obj, form, change):
        obj.user = None
        super().save_model(request, obj, form, change)


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
