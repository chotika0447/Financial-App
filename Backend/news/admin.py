
from django.contrib import admin, messages
from django.db import transaction
from django.utils import timezone

from .models import News


@admin.register(News)
class NewsAdmin(admin.ModelAdmin):

    list_display = (
        'title',
        'batch_id',
        'position',
        'published_at',
        'is_active',
        'carried_over',
        'source',
    )

    list_filter = (
        'is_active',
        'carried_over',
        'source',
    )

    search_fields = (
        'title',
        'canonical',
        'batch_id',
    )

    ordering = ('-published_at', 'position')

    readonly_fields = (
        'batch_id',
        'created_at',
        'published_at',
        'fetched_count',
    )

    actions = ['publish_selected_batch']

    @admin.action(description='Publish selected complete news batch')
    def publish_selected_batch(self, request, queryset):

        batch_ids = list(
            queryset.values_list('batch_id', flat=True).distinct()
        )

        if len(batch_ids) != 1:
            self.message_user(
                request,
                'Please select news from exactly one batch.',
                level=messages.ERROR
            )
            return

        batch_id = batch_ids[0]

        batch = News.objects.filter(batch_id=batch_id)

        if batch.count() != 5:
            self.message_user(
                request,
                'Batch must contain exactly 5 news items.',
                level=messages.ERROR
            )
            return

        with transaction.atomic():

            News.objects.filter(is_active=True).update(
                is_active=False
            )

            batch.update(
                is_active=True,
                published_at=timezone.now()
            )

        self.message_user(
            request,
            'News batch published successfully.',
            level=messages.SUCCESS
        )
