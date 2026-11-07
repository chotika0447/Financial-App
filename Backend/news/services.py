
import logging
from datetime import datetime, timezone as dt_timezone
from uuid import uuid4

import requests
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .models import News

logger = logging.getLogger(__name__)

NEWS_URL = 'https://api.thaipbs.net/v1/news/posts'

KEYWORDS = (
    'เศรษฐกิจ', 'การเงิน', 'ธนาคาร', 'ดอกเบี้ย', 'เงินเฟ้อ',
    'การลงทุน', 'ตลาดหุ้น', 'เงินบาท', 'หนี้', 'ภาษี',
    'ออมเงิน', 'ค่าครองชีพ', 'ธุรกิจ', 'กองทุน', 'สินเชื่อ',
    'ราคาทอง'
)


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
            response = session.get(
                NEWS_URL,
                params={'page': page, 'limit': 60},
                timeout=15
            )
            response.raise_for_status()

            payload = response.json()
            items = payload.get('data')

            if not isinstance(items, list):
                raise ValueError(
                    'Unexpected Thai PBS response: data is not a list'
                )

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

                context = ' '.join(
                    [title] + [
                        str(x.get('title') or '')
                        for x in categories + tags
                        if isinstance(x, dict)
                    ]
                )

                if not any(word in context for word in KEYWORDS):
                    continue

                media = item.get('media') or {}
                seo = item.get('seoDetails') or {}

                image = (
                    item.get('mediaUrl')
                    or (
                        media.get('default')
                        if isinstance(media, dict) else ''
                    )
                    or (
                        seo.get('ogImage')
                        if isinstance(seo, dict) else ''
                    )
                    or ''
                )

                found[url] = {
                    'title': title[:500],
                    'canonical': url[:1000],
                    'media_url': str(image)[:1000],
                    'publish_time': parse_date(
                        item.get('publishTime')
                    ),
                    'carried_over': False,
                }

    return sorted(
        found.values(),
        key=lambda x: (
            x['publish_time']
            or datetime.min.replace(tzinfo=dt_timezone.utc)
        ),
        reverse=True
    )


def refresh_news():
    # Fetch news from Thai PBS
    candidates = fetch_candidates()

    selected = candidates[:5]
    urls = {item['canonical'] for item in selected}

    # Get current active news batch
    old_batch_id = (
        News.objects
        .filter(is_active=True)
        .order_by('-published_at', '-batch_id')
        .values_list('batch_id', flat=True)
        .first()
    )

    # Carry over old news if fewer than 5 new stories are available
    if len(selected) < 5 and old_batch_id:
        old_items = (
            News.objects
            .filter(batch_id=old_batch_id)
            .order_by('position')
        )

        for item in old_items:
            if len(selected) == 5:
                break

            if item.canonical not in urls:
                selected.append({
                    'title': item.title,
                    'canonical': item.canonical,
                    'media_url': item.media_url,
                    'publish_time': item.publish_time,
                    'carried_over': True,
                })

                urls.add(item.canonical)

    # Do not replace current news if fewer than 5 stories are available
    if len(selected) != 5:
        logger.warning(
            'News refresh skipped: only %s unique suitable stories available',
            len(selected)
        )
        return None

    new_batch_id = uuid4().hex
    now = timezone.now()

    with transaction.atomic():

        # Lock active news rows before publishing
        list(
            News.objects
            .select_for_update()
            .filter(is_active=True)
            .values_list('id', flat=True)
        )

        # Create new news batch
        new_items = [
            News(
                batch_id=new_batch_id,
                position=i,
                title=item['title'],
                canonical=item['canonical'],
                media_url=item['media_url'],
                publish_time=item['publish_time'],
                carried_over=item['carried_over'],
                created_at=now,
                published_at=now,
                source='Thai PBS',
                is_active=False,
                fetched_count=min(len(candidates), 65535),
            )
            for i, item in enumerate(selected, start=1)
        ]

        News.objects.bulk_create(new_items)

        # Deactivate previous news batch
        News.objects.filter(is_active=True).update(
            is_active=False
        )

        # Activate new news batch
        News.objects.filter(batch_id=new_batch_id).update(
            is_active=True
        )

    logger.info(
        'Published news batch %s with %s stories',
        new_batch_id,
        len(selected)
    )

    return new_batch_id
