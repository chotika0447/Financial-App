from django.db import migrations, models


# Keep legacy category icons consistent with the existing Transactions UI.
LEGACY_ICONS = {
    "ของใช้": "coffee", "ความงาม": "shopping-bag", "ความบันเทิง": "car-front",
    "ค่าเช่า": "heart", "ค่าเดินทาง": "book-open", "ค่าโทรศัพท์": "phone",
    "ค่าน้ำไฟ": "zap", "ค่าหมอ": "sparkles", "เครื่องดื่ม": "coffee",
    "ช้อปปิ้ง": "shopping-bag", "ซูเปอร์มาร์เก็ต": "car-front",
    "ทำบุญ": "hand-heart", "อาหาร": "utensils-crossed", "อื่นๆ": "wallet",
    "งานเสริม": "briefcase-business", "เงินเดือน": "banknote",
    "โบนัส": "gift", "รายได้": "wallet", "ลงทุน": "trending-up",
}


def backfill_icons(apps, schema_editor):
    Category = apps.get_model("categories", "Category")
    for name, icon in LEGACY_ICONS.items():
        Category.objects.filter(name=name).update(icon=icon)


class Migration(migrations.Migration):
    dependencies = [("categories", "0004_repair_category_schema")]
    operations = [
        migrations.AddField(
            model_name="category", name="icon",
            field=models.CharField(max_length=60, default="ellipsis"),
        ),
        migrations.RunPython(backfill_icons, migrations.RunPython.noop),
    ]
