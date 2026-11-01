from django.db import models

class NewsBatch(models.Model):
    # One published snapshot, shared by every user until a complete replacement is ready.
    created_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True, blank=True)
    source = models.CharField(max_length=50, default='Thai PBS')
    is_active = models.BooleanField(default=False, db_index=True)
    fetched_count = models.PositiveSmallIntegerField(default=0)

    def __str__(self):
        return f'News batch #{self.pk} ({self.published_at})'

class NewsItem(models.Model):
    batch = models.ForeignKey(NewsBatch, related_name='items', on_delete=models.CASCADE)
    position = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=500)
    canonical = models.URLField(max_length=1000)
    media_url = models.URLField(max_length=1000, blank=True)
    publish_time = models.DateTimeField(null=True, blank=True)
    carried_over = models.BooleanField(default=False)

    class Meta:
        ordering = ['position']
        constraints = [models.UniqueConstraint(fields=['batch','position'], name='news_batch_position_unique')]

    def __str__(self):
        return self.title
