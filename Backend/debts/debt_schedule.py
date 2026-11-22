"""Shared monthly debt schedule calculations. Dates use Django's local timezone."""
from calendar import monthrange
from datetime import date
from decimal import Decimal, ROUND_CEILING
from django.utils import timezone


def monthly_due_date(year, month, payment_day):
    return date(year, month, min(int(payment_day), monthrange(year, month)[1]))


def initial_monthly_due_date(payment_day, today=None):
    today = today or timezone.localdate()
    due = monthly_due_date(today.year, today.month, payment_day)
    if due < today:
        year = today.year + (today.month == 12)
        month = today.month % 12 + 1
        due = monthly_due_date(year, month, payment_day)
    return due


def last_installment_due_date(first_due, payment_day, total_amount, payment_amount):
    installments = int((Decimal(total_amount) / Decimal(payment_amount)).to_integral_value(rounding=ROUND_CEILING))
    index = first_due.year * 12 + first_due.month - 1 + installments - 1
    year, zero_month = divmod(index, 12)
    return monthly_due_date(year, zero_month + 1, payment_day)
