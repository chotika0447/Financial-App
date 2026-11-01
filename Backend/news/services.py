import logging
from datetime import datetime, timezone as dt_timezone

import requests
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .models import NewsBatch, NewsItem

logger = logging.getLogger(__name__)
NEWS_URL = 'https://api.thaipbs.net/v1/news/posts'
KEYWORDS = ('เศรษฐกิจ', 'การเงิน', 'ธนาคาร', 'ดอกเบี้ย', 'เงินเฟ้อ', 'การลงทุน',
            'ตลาดหุ้น', 'เงินบาท', 'หนี้', 'ภาษี', 'ออมเงิน', 'ค่าครองชีพ',
            'ธุรกิจ', 'กองทุน', 'สินเชื่อ', 'ราคาทอง')

def parse_date(value):
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        dt = parse_datetime(str(value))
    if dt is None:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, dt_timezone.utc)
    return dt

def fetch_candidates():
    found = {}
    with requests.Session() as session:
        for page in range(1, 6):
            response = session.get(NEWS_URL, params={'page': page, 'limit': 60}, timeout=15)
            response.raise_for_status()
            payload = response.json()
            items = payload.get('data')
            if not isinstance(items, list):
                raise ValueError('Unexpected Thai PBS response: data is not a list')
            if not items:
                break
            for item in items:
                if not isinstance(item, dict):
                    continue
                title = str(item.get('title') or '').strip()
                url = str(item.get('canonical') or '').strip()
                if not title or not url.startswith('https://'):
                    continue
                categories = item.get('categories') or []
                tags = item.get('tags') or []
                context = ' '.join([title] + [str(x.get('title') or '') for x in categories + tags if isinstance(x, dict)])
                if not any(word in context for word in KEYWORDS):
                    continue
                media = item.get('media') or {}
                seo = item.get('seoDetails') or {}
                image = item.get('mediaUrl') or (media.get('default') if isinstance(media, dict) else '') or (seo.get('ogImage') if isinstance(seo, dict) else '') or ''
                found[url] = {
                    'title': title[:500], 'canonical': url[:1000],
                    'media_url': str(image)[:1000],
                    'publish_time': parse_date(item.get('publishTime')),
                    'carried_over': False,
                }
    return sorted(found.values(), key=lambda x: x['publish_time'] or datetime.min.replace(tzinfo=dt_timezone.utc), reverse=True)

def refresh_news():
    # A failed fetch or insufficient candidates never replaces the current active batch.
    candidates = fetch_candidates()
    selected = candidates[:5]
    urls = {item['canonical'] for item in selected}
    old = NewsBatch.objects.filter(is_active=True).order_by('-published_at', '-id').first()
    if len(selected) < 5 and old:
        for item in old.items.all():
            if len(selected) == 5:
                break
            if item.canonical not in urls:
                selected.append({
                    'title': item.title, 'canonical': item.canonical,
                    'media_url': item.media_url, 'publish_time': item.publish_time,
                    'carried_over': True,
                })
                urls.add(item.canonical)
    if len(selected) != 5:
        logger.warning('News refresh skipped: only %s unique suitable stories available', len(selected))
        return None
    with transaction.atomic():
        # Lock batch rows to serialize concurrent publication jobs.
        list(NewsBatch.objects.select_for_update().filter(is_active=True))
        batch = NewsBatch.objects.create(is_active=False, fetched_count=len(candidates))
        NewsItem.objects.bulk_create([
            NewsItem(batch=batch, position=i, **item)
            for i, item in enumerate(selected, start=1)
        ])
        NewsBatch.objects.filter(is_active=True).update(is_active=False)
        batch.is_active = True
        batch.published_at = timezone.now()
        batch.save(update_fields=['is_active', 'published_at'])
    return batch
