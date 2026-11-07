
from django.db import migrations


def repair_category_schema(apps, schema_editor):
    connection = schema_editor.connection

    tables = set(connection.introspection.table_names())

    Category = apps.get_model("categories", "Category")
    UserKeyword = apps.get_model("categories", "UserKeyword")

    # 1. ตรวจสอบและเพิ่ม user_id ใน categories_category
    if "categories_category" not in tables:
        raise RuntimeError(
            "categories_category table does not exist. "
            "Cannot repair category schema safely."
        )

    with connection.cursor() as cursor:
        columns = {
            column.name
            for column in connection.introspection.get_table_description(
                cursor, "categories_category"
            )
        }

    if "user_id" not in columns:
        schema_editor.add_field(
            Category,
            Category._meta.get_field("user")
        )

    # 2. สร้าง categories_userkeyword หากยังไม่มี
    if "categories_userkeyword" not in tables:
        schema_editor.create_model(UserKeyword)


class Migration(migrations.Migration):

    dependencies = [
        ("categories", "0003_alter_category_user_brand_userkeyword"),
    ]

    operations = [
        migrations.RunPython(
            repair_category_schema,
            migrations.RunPython.noop
        ),
    ]
