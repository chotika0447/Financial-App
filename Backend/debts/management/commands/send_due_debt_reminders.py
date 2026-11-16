import logging
from datetime import timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from debts.models import DebtReminderLog, Debts, Payments
from debts.views import get_initial_monthly_due_date
from line_bot.messaging import push_debt_payment_reminder

logger = logging.getLogger(__name__)
BANGKOK = ZoneInfo('Asia/Bangkok')
ZERO = Decimal('0.00')


def is_reminder_date(debt, due_date, today):
    start = due_date - timedelta(days=debt.reminder_days_before)
    if debt.reminder_repeat:
        return start <= today < due_date
    return today == start and today < due_date


def installment_is_paid(debt, due_date):
    """Count submitted and approved payments for this installment, across linked debts."""
    ids = [debt.pk]
    if debt.paired_debt_id:
        ids.append(debt.paired_debt_id)
    submitted = (
        Payments.objects.filter(
            debt_id__in=ids,
            due_date=due_date,
            approvement_status__in=['pending', 'approved'],
        ).aggregate(total=Sum('paid_amount'))['total'] or ZERO
    )
    # Remaining amount is based on approved payments only. Include pending
    # payments when deciding whether to stop reminders.
    all_submitted = (
        Payments.objects.filter(
            debt_id__in=ids,
            approvement_status__in=['pending', 'approved'],
        ).aggregate(total=Sum('paid_amount'))['total'] or ZERO
    )
    outstanding = max(ZERO, debt.total_amount - all_submitted)
    target = min(debt.payment_amount or ZERO, submitted + outstanding)
    return target <= ZERO or submitted >= target


class Command(BaseCommand):
    help = 'Send scheduled LINE Flex reminders for debts due soon.'

    def handle(self, *args, **options):
        now = timezone.now().astimezone(BANGKOK)
        today = now.date()
        current_time = now.time().replace(tzinfo=None, second=0, microsecond=0)
        sent_count = skipped_count = failed_count = 0

        debts = (
            Debts.objects.filter(
                reminder_enabled=True,
                status='ongoing',
                type='borrowed',
            ).select_related('user').iterator()
        )

        for debt in debts:
            if not debt.reminder_time:
                continue
            scheduled_time = debt.reminder_time.replace(tzinfo=None, second=0, microsecond=0)
            if current_time < scheduled_time:
                continue

            try:
                if debt.payment_type == 'monthly':
                    due_date = debt.current_due_date or get_initial_monthly_due_date(debt, today=today)
                else:
                    due_date = debt.due_date

                if not is_reminder_date(debt, due_date, today):
                    continue

                ids = [debt.pk]
                if debt.paired_debt_id:
                    ids.append(debt.paired_debt_id)
                submitted_total = (
                    Payments.objects.filter(
                        debt_id__in=ids,
                        approvement_status__in=['pending', 'approved'],
                    ).aggregate(total=Sum('paid_amount'))['total'] or ZERO
                )
                if submitted_total >= debt.total_amount:
                    skipped_count += 1
                    continue
                if debt.payment_type == 'monthly' and installment_is_paid(debt, due_date):
                    skipped_count += 1
                    continue

                with transaction.atomic():
                    reminder_log, _ = DebtReminderLog.objects.get_or_create(
                        debt=debt,
                        due_date=due_date,
                        reminder_date=today,
                        defaults={
                            'status': 'failed',
                            'error_message': 'Not sent yet',
                        },
                    )
                    reminder_log = DebtReminderLog.objects.select_for_update().get(pk=reminder_log.pk)
                    if reminder_log.status == 'sent':
                        skipped_count += 1
                        continue
                    try:
                        sent = push_debt_payment_reminder(debt, due_date, None)
                        error_message = '' if sent else 'LINE API rejected request; check backend logs'
                    except Exception as exc:
                        logger.exception('LINE reminder failed for debt %s', debt.pk)
                        sent = False
                        error_message = str(exc)
                    reminder_log.status = 'sent' if sent else 'failed'
                    reminder_log.error_message = error_message
                    reminder_log.save(update_fields=['status', 'error_message'])
                    if sent:
                        sent_count += 1
                    else:
                        failed_count += 1
                        self.stderr.write(f'Debt {debt.pk}: LINE reminder failed: {error_message}')
            except Exception as exc:
                logger.exception('Could not process debt %s', debt.pk)
                failed_count += 1
                self.stderr.write(f'Debt {debt.pk}: {exc}')

        self.stdout.write(f'Debt reminders: {sent_count} sent, {skipped_count} skipped, {failed_count} failed.')
        if failed_count:
            raise CommandError(f'{failed_count} debt reminder(s) failed; see logs above.')
