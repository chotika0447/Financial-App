from django.contrib import admin
from .models import NewsBatch, NewsItem

class NewsItemInline(admin.TabularInline):
    model = NewsItem
    extra = 0
    readonly_fields = ('position', 'title', 'canonical', 'media_url', 'publish_time', 'carried_over')
    can_delete = False

@admin.register(NewsBatch)
class NewsBatchAdmin(admin.ModelAdmin):
    list_display = ('id', 'published_at', 'is_active', 'fetched_count', 'source')
    list_filter = ('is_active',)
    inlines = [NewsItemInline]
    actions = ['publish_selected_batch']

    @admin.action(description='Publish selected complete batch (exactly one)')
    def publish_selected_batch(self, request, queryset):
        from django.contrib import messages
        from django.db import transaction
        if queryset.count() != 1:
            self.message_user(request, 'Select exactly one batch.', level=messages.ERROR)
            return
        batch = queryset.first()
        if batch.items.count() != 5:
            self.message_user(request, 'Batch must have exactly 5 items.', level=messages.ERROR)
            return
        with transaction.atomic():
            NewsBatch.objects.filter(is_active=True).update(is_active=False)
            batch.is_active = True
            batch.published_at = __import__('django.utils.timezone', fromlist=['now']).now()
            batch.save(update_fields=['is_active', 'published_at'])
        self.message_user(request, 'Batch published.')
