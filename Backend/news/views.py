
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import News


@require_GET
def latest_news(request):

    batch_id = (
        News.objects
        .filter(is_active=True)
        .order_by('-published_at', '-batch_id')
        .values_list('batch_id', flat=True)
        .first()
    )

    if not batch_id:
        return JsonResponse({
            'count': 0,
            'updated_at': None,
            'news': [],
            'detail': 'No published news batch yet'
        }, status=503)

    items = list(
        News.objects
        .filter(batch_id=batch_id, is_active=True)
        .order_by('position')[:5]
    )

    first_item = items[0] if items else None

    return JsonResponse({
        'count': len(items),
        'updated_at': (
            first_item.published_at.isoformat()
            if first_item and first_item.published_at
            else None
        ),
        'source': first_item.source if first_item else 'Thai PBS',
        'news': [
            {
                'title': item.title,
                'canonical': item.canonical,
                'mediaUrl': item.media_url,
                'publishTime': (
                    item.publish_time.isoformat()
                    if item.publish_time else None
                ),
                'carriedOver': item.carried_over,
            }
            for item in items
        ],
    })
