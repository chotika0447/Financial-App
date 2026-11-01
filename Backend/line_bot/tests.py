from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, override_settings

from .messaging import (
    push_new_debt_notification,
    push_payment_submitted_notification,
)
from .views import handle_postback


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


@override_settings(
    FRONTEND_URL="https://financial-app-delta-taupe.vercel.app/",
    LINE_BOT_CHANNEL_ACCESS_TOKEN="test-token",
)
class PushPaymentSubmittedNotificationTests(SimpleTestCase):
    @patch("line_bot.messaging.httpx.post")
    def test_approval_and_history_buttons_target_payment(self, post):
        post.return_value = Mock(status_code=200, text="OK")
        creditor = SimpleNamespace(
            pk=12,
            line_uid="creditor-line-user",
            username="เจ้าหนี้",
        )
        creditor_debt = SimpleNamespace(
            pk=42,
            type="lent",
            user=creditor,
        )
        debt = SimpleNamespace(
            pk=41,
            type="borrowed",
            paired_debt_id=creditor_debt.pk,
            paired_debt=creditor_debt,
            user=SimpleNamespace(username="ลูกหนี้"),
            name="ค่าใช้จ่าย",
        )
        payment = SimpleNamespace(
            pk=99,
            debt=debt,
            paid_date=date(2026, 10, 20),
            proof_image=None,
            paid_amount=Decimal("120.00"),
        )

        result = push_payment_submitted_notification(payment)

        self.assertTrue(result)
        payload = post.call_args.kwargs["json"]
        buttons = payload["messages"][0]["contents"]["body"]["contents"][-1][
            "contents"
        ]
        self.assertEqual(
            buttons[0]["action"]["data"],
            "action=payment_approve&payment_id=99",
        )
        self.assertEqual(
            buttons[1]["action"]["uri"],
            "https://financial-app-delta-taupe.vercel.app/"
            "debts/?debtId=42&view=payment_history",
        )


class SavingsRichMenuTests(SimpleTestCase):
    @patch("line_bot.views.build_savings_list_flex")
    @patch("line_bot.views.User.objects.filter")
    def test_savings_menu_actions_open_savings_list(
        self, filter_user, build_savings_list
    ):
        user = SimpleNamespace()
        savings_list = {"type": "flex"}
        filter_user.return_value.first.return_value = user
        build_savings_list.return_value = savings_list

        for data in (
            "action=select_record&type=saving",
            "action=select_record&type=savings",
            "action=view_savings",
        ):
            with self.subTest(data=data):
                self.assertEqual(
                    handle_postback(data, "line-user"),
                    savings_list,
                )

        self.assertEqual(build_savings_list.call_count, 3)
