from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, override_settings

from .messaging import push_new_debt_notification


@override_settings(
    FRONTEND_URL="https://financial-app-delta-taupe.vercel.app/",
    LINE_BOT_CHANNEL_ACCESS_TOKEN="test-token",
)
class PushNewDebtNotificationTests(SimpleTestCase):
    @patch("line_bot.messaging.httpx.post")
    def test_button_opens_debts_page(self, post):
        post.return_value = Mock(status_code=200, text="OK")
        debt = SimpleNamespace(
            pk=42,
            user=SimpleNamespace(line_uid="line-user"),
            type="borrowed",
            due_date=date(2026, 10, 20),
            note="",
            name="ค่าใช้จ่าย",
            total_amount=Decimal("120.00"),
        )

        result = push_new_debt_notification(debt, target_debt=debt)

        self.assertTrue(result)
        payload = post.call_args.kwargs["json"]
        button_url = payload["messages"][0]["contents"]["body"]["contents"][-1][
            "action"
        ]["uri"]
        self.assertEqual(
            button_url,
            "https://financial-app-delta-taupe.vercel.app/debts/",
        )
