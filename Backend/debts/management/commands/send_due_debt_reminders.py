import logging
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from debts.models import DebtReminderLog, Debts
from debts.views import get_initial_monthly_due_date
from line_bot.messaging import push_debt_payment_reminder


logger = logging.getLogger(__name__)


def is_reminder_date(debt, due_date, today):
    reminder_start = due_date - timedelta(
        days=debt.reminder_days_before
    )

    if debt.reminder_repeat:
        return reminder_start <= today <= due_date

    return today == reminder_start


class Command(BaseCommand):
    help = "Send scheduled LINE reminders for debts due soon."

    def add_arguments(self, parser):
        parser.add_argument(
            "--test-debt-id",
            type=int,
            help=(
                "Send one real reminder immediately for this eligible debt, "
                "without waiting for its configured date or time."
            ),
        )

    def handle(self, *args, **options):
        now = timezone.localtime()
        today = now.date()
        current_time = now.time().replace(second=0, microsecond=0)
        sent_count = 0
        skipped_count = 0
        failed_count = 0

        debts = (
            Debts.objects.filter(
                reminder_enabled=True,
                status="ongoing",
                remaining_amount__gt=0,
                type="borrowed",
            )
            .select_related("user")
        )

        test_debt_id = options.get("test_debt_id")
        if test_debt_id is not None:
            debt = debts.filter(pk=test_debt_id).first()
            if debt is None:
                raise CommandError(
                    "Debt not found or not eligible for reminders "
                    "(it must be enabled, ongoing, unpaid, and borrowed)."
                )

            if not debt.user.line_uid:
                raise CommandError(
                    f"Debt {debt.pk}: the receiving account has no LINE User ID."
                )
            if not settings.LINE_BOT_CHANNEL_ACCESS_TOKEN:
                raise CommandError(
                    "LINE_BOT_CHANNEL_ACCESS_TOKEN is not configured."
                )

            try:
                due_date = get_debt_due_date(debt, today)
                sent = push_debt_payment_reminder(debt, due_date, None)
            except Exception as error:
                logger.exception(
                    "Error sending test reminder for debt %s",
                    debt.pk,
                )
                raise CommandError(
                    f"Test reminder for debt {debt.pk} failed: {error}"
                ) from error

            if not sent:
                raise CommandError(
                    f"LINE did not confirm the test reminder for debt {debt.pk}; "
                    "check the backend logs and LINE OA configuration."
                )

            self.stdout.write(
                self.style.SUCCESS(
                    f"Test reminder sent for debt {debt.pk}. "
                    "This test was not added to the reminder log."
                )
            )
            return

        for debt in debts.iterator():
            if current_time < debt.reminder_time:
                continue

            try:
                due_date = get_debt_due_date(debt, today)
            except (TypeError, ValueError) as error:
                logger.exception(
                    "Could not determine due date for debt %s",
                    debt.pk,
                )
                self.stderr.write(
                    f"Debt {debt.pk}: could not determine due date: {error}"
                )
                failed_count += 1
                continue

            if not is_reminder_date(debt, due_date, today):
                continue

            try:
                with transaction.atomic():
                    reminder_log, _ = DebtReminderLog.objects.get_or_create(
                        debt=debt,
                        due_date=due_date,
                        reminder_date=today,
                        defaults={
                            "status": "failed",
                            "error_message": "Reminder has not been sent yet.",
                        },
                    )
                    reminder_log = DebtReminderLog.objects.select_for_update().get(
                        pk=reminder_log.pk
                    )

                    if reminder_log.status == "sent":
                        skipped_count += 1
                        continue

                    try:
                        sent = push_debt_payment_reminder(
                            debt,
                            due_date,
                            None,
                        )
                    except Exception as error:
                        logger.exception(
                            "Error sending reminder for debt %s",
                            debt.pk,
                        )
                        sent = False
                        error_message = str(error)
                    else:
                        error_message = (
                            ""
                            if sent
                            else "LINE OA did not confirm delivery; see backend logs."
                        )

                    reminder_log.status = "sent" if sent else "failed"
                    reminder_log.error_message = error_message
                    reminder_log.save(
                        update_fields=["status", "error_message"]
                    )

                    if sent:
                        sent_count += 1
                    else:
                        failed_count += 1
                        self.stderr.write(
                            f"Debt {debt.pk}: LINE reminder was not sent."
                        )
            except Exception as error:
                logger.exception(
                    "Could not process reminder for debt %s",
                    debt.pk,
                )
                self.stderr.write(
                    f"Debt {debt.pk}: failed to process reminder: {error}"
                )
                failed_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Debt reminders: "
                f"{sent_count} sent, "
                f"{skipped_count} already sent, "
                f"{failed_count} failed."
            )
        )

        if failed_count:
            raise CommandError(
                f"{failed_count} debt reminder(s) failed; see logs above."
            )


def get_debt_due_date(debt, today):
    if debt.payment_type == "monthly":
        if debt.current_due_date is not None:
            return debt.current_due_date
        return get_initial_monthly_due_date(debt, today=today)

    return debt.due_date
