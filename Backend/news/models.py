
from django.db import models
from django.utils import timezone


class News(models.Model):
    # Batch information
    batch_id = models.CharField(max_length=64, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)
    published_at = models.DateTimeField(null=True, blank=True)
    source = models.CharField(max_length=50, default='Thai PBS')
    is_active = models.BooleanField(default=False, db_index=True)
    fetched_count = models.PositiveSmallIntegerField(default=0)

    # News information
    position = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=500)
    canonical = models.URLField(max_length=1000)
    media_url = models.URLField(max_length=1000, blank=True)
    publish_time = models.DateTimeField(null=True, blank=True)
    carried_over = models.BooleanField(default=False)

    class Meta:
        ordering = ['position']
        constraints = [
            models.UniqueConstraint(
                fields=['batch_id', 'position'],
                name='news_batch_position_unique'
            )
        ]

    def __str__(self):
        return self.title
