"""Shared assessment-period and scoring helpers."""
from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Sum
from django.utils import timezone
from finhealth.models import FinancialPeriod
from transactions.models import Transaction
from users.models import PersonalProfile

ZERO = Decimal("0")
HUNDRED = Decimal("100")

def rounded(value):
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) if value is not None else None

def percent(numerator, denominator):
    return rounded(Decimal(numerator) / Decimal(denominator) * HUNDRED) if denominator > 0 else None

def score(value):
    return rounded(max(ZERO, min(HUNDRED, Decimal(value)))) if value is not None else None

def get_period(user, as_of=None):
    """Read stored period; fallback to calendar month for existing users."""
    today = as_of or timezone.localdate()
    period = FinancialPeriod.objects.filter(user=user, start_date__lte=today,
                                            end_date__gte=today).order_by("-start_date").first()
    if period:
        return period.start_date, period.end_date, period.is_transition
    start = today.replace(day=1)
    end = today.replace(day=monthrange(today.year, today.month)[1])
    return start, end, False

def segments(start, end):
    """Four periods: days 1-7, 8-14, 15-21, 22-end relative to start."""
    return [(i + 1, start + timedelta(days=a), min(end, start + timedelta(days=b)))
            for i, (a,b) in enumerate([(0,6),(7,13),(14,20),(21,(end-start).days)])
            if start + timedelta(days=a) <= end]

def income_for_period(user, start, end):
    profile = PersonalProfile.objects.filter(user=user).first()
    salary = Decimal(profile.salary or 0) if profile else ZERO
    transactions = (Transaction.objects.filter(user=user, transaction_type="income",
                     transaction_date__gte=start, transaction_date__lte=end)
                    .aggregate(total=Sum("amount"))["total"] or ZERO)
    # Existing project convention: salary is counted once per financial period.
    # If income transactions already contain salary, it will double count.
    return salary, transactions, salary + transactions

def score_eir(value):
    return score(HUNDRED - Decimal("1.25") * (value - Decimal("60"))) if value is not None else None

def score_sr(value):
    return score(value * 5) if value is not None else None

def score_dsr(value):
    if value is None: return None
    x = Decimal(value)
    if x <= 15: return HUNDRED
    if x <= 30: return score(HUNDRED - 2*(x-15))
    if x <= 35: return score(70 - 2*(x-30))
    if x <= 40: return score(60 - 4*(x-35))
    if x <= 45: return score(40 - 4*(x-40))
    return ZERO

def mean(a,b):
    return rounded((a+b)/2) if a is not None and b is not None else None
