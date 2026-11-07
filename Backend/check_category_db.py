
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT
            table_name,
            column_name,
            data_type,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name IN (
            'categories_category',
            'categories_brand',
            'categories_userkeyword',
            'users_user'
        )
        ORDER BY table_name, ordinal_position
    """)

    print("\n=== TABLE COLUMNS ===")
    for row in cursor.fetchall():
        print(row)

    cursor.execute("""
        SELECT app, name, applied
        FROM django_migrations
        WHERE app = 'categories'
        ORDER BY applied
    """)

    print("\n=== CATEGORY MIGRATIONS ===")
    for row in cursor.fetchall():
        print(row)
