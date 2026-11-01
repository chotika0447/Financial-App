from django.core.management.base import BaseCommand
from news.services import refresh_news

class Command(BaseCommand):
    help = 'Fetch financial news from Thai PBS and publish a complete 5-story snapshot'

    def handle(self, *args, **options):
        batch = refresh_news()
        if batch:
            self.stdout.write(self.style.SUCCESS(f'Published batch #{batch.pk}, 5 stories'))
        else:
            self.stdout.write(self.style.WARNING('No replacement published; previous batch preserved'))
