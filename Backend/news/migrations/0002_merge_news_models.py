
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


def migrate_news_data(apps, schema_editor):
    News = apps.get_model('news', 'News')

    db_alias = schema_editor.connection.alias

    items = (
        News.objects.using(db_alias)
        .select_related('legacy_batch')
        .all()
    )

    for item in items:
        batch = item.legacy_batch

        item.batch_id = str(batch.pk)
        item.created_at = batch.created_at
        item.published_at = batch.published_at
        item.source = batch.source
        item.is_active = batch.is_active
        item.fetched_count = batch.fetched_count

        item.save(update_fields=[
            'batch_id',
            'created_at',
            'published_at',
            'source',
            'is_active',
            'fetched_count',
        ])


class Migration(migrations.Migration):

    dependencies = [
        ('news', '0001_initial'),
    ]

    operations = [

        migrations.RenameModel(
            old_name='NewsItem',
            new_name='News',
        ),

        migrations.RenameField(
            model_name='news',
            old_name='batch',
            new_name='legacy_batch',
        ),

        migrations.AddField(
            model_name='news',
            name='batch_id',
            field=models.CharField(
                db_index=True,
                max_length=64,
                default=''
            ),
            preserve_default=False,
        ),

        migrations.AddField(
            model_name='news',
            name='created_at',
            field=models.DateTimeField(
                default=django.utils.timezone.now
            ),
        ),

        migrations.AddField(
            model_name='news',
            name='published_at',
            field=models.DateTimeField(
                blank=True,
                null=True
            ),
        ),

        migrations.AddField(
            model_name='news',
            name='source',
            field=models.CharField(
                default='Thai PBS',
                max_length=50
            ),
        ),

        migrations.AddField(
            model_name='news',
            name='is_active',
            field=models.BooleanField(
                db_index=True,
                default=False
            ),
        ),

        migrations.AddField(
            model_name='news',
            name='fetched_count',
            field=models.PositiveSmallIntegerField(
                default=0
            ),
        ),

        migrations.RunPython(
            migrate_news_data,
            migrations.RunPython.noop
        ),

        migrations.RemoveConstraint(
            model_name='news',
            name='news_batch_position_unique',
        ),

        migrations.RemoveField(
            model_name='news',
            name='legacy_batch',
        ),

        migrations.AddConstraint(
            model_name='news',
            constraint=models.UniqueConstraint(
                fields=('batch_id', 'position'),
                name='news_batch_position_unique',
            ),
        ),

        migrations.DeleteModel(
            name='NewsBatch',
        ),
    ]
