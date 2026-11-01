from django.http import JsonResponse
from django.views.decorators.http import require_GET
from .models import NewsBatch

@require_GET
def latest_news(request):
    batch = NewsBatch.objects.filter(is_active=True).order_by('-published_at', '-id').first()
    if not batch:
        return JsonResponse({'count': 0, 'updated_at': None, 'news': [], 'detail': 'No published news batch yet'}, status=503)
    items = list(batch.items.all()[:5])
    return JsonResponse({
        'count': len(items),
        'updated_at': batch.published_at.isoformat() if batch.published_at else None,
        'source': batch.source,
        'news': [{
            'title': item.title, 'canonical': item.canonical,
            'mediaUrl': item.media_url,
            'publishTime': item.publish_time.isoformat() if item.publish_time else None,
            'carriedOver': item.carried_over,
        } for item in items],
    })
