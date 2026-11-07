"""Resolve category for LINE text without leaking other users' categories."""
import re
from categories.models import Brand, Category, UserKeyword


def keyword_in_text(keyword, text):
    keyword = (keyword or "").strip().casefold()
    if not keyword:
        return False
    escaped = re.escape(keyword)
    # Avoid matching short Latin brands inside longer Latin words.
    if keyword[0].isascii() and keyword[0].isalnum():
        escaped = r"(?<![a-z0-9])" + escaped
    if keyword[-1].isascii() and keyword[-1].isalnum():
        escaped += r"(?![a-z0-9])"
    return re.search(escaped, text.casefold()) is not None


def accessible_category(name, transaction_type, user):
    """Prefer user's own exact name; then a global name. Never other users'."""
    if not name or user is None:
        return None
    for owner in (user, None):
        category = Category.objects.filter(
            user=owner, name__iexact=name.strip(), transaction_type=transaction_type
        ).first()
        if category:
            return category
    return None


def fallback_category(transaction_type, user):
    # Always prefer shared fallback, not a private 'อื่นๆ' from another user.
    for name in ("อื่นๆ", "อื่น"):
        result = accessible_category(name, transaction_type, user)
        if result:
            return result
    return None


def match_category(text, transaction_type, user, rule_category="อื่นๆ"):
    if user is None:
        return None
    # 1. Explicitly assigned keywords (never auto-learn raw messages).
    keywords = UserKeyword.objects.filter(
        user=user, transaction_type=transaction_type
    ).select_related("category")
    for entry in sorted(keywords, key=lambda x: len(x.keyword), reverse=True):
        if (entry.category.transaction_type == transaction_type
                and entry.category.user_id in (None, user.pk)
                and keyword_in_text(entry.keyword, text)):
            return entry.category

    # 2. User-defined category names (longest first).
    personal = Category.objects.filter(user=user, transaction_type=transaction_type)
    for entry in sorted(personal, key=lambda x: len(x.name), reverse=True):
        if keyword_in_text(entry.name, text):
            return entry

    # 3. Shared brand DB, not other users' categories.
    brands = Brand.objects.filter(
        transaction_type=transaction_type, category__user__isnull=True,
        category__transaction_type=transaction_type
    ).select_related("category")
    for entry in sorted(brands, key=lambda x: len(x.keyword), reverse=True):
        if keyword_in_text(entry.keyword, text):
            return entry.category

    # 4. Existing rules, but only if the resulting category is accessible.
    rule_aliases = {"ชอปปิ้ง": "ช้อปปิ้ง", "การเดินทาง": "ค่าเดินทาง"}
    candidate = rule_aliases.get(rule_category, rule_category)
    return accessible_category(candidate, transaction_type, user) or fallback_category(transaction_type, user)
