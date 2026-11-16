from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from users.models import User
from .models import Savings, SavingsTransaction


class SavingsBalanceActionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(line_uid="completed-wallet-test")
        self.saving = Savings.objects.create(
            user=self.user,
            saving_name="Trip",
            target=Decimal("100.00"),
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_deposit_completing_target_updates_wallet_and_records_transaction(self):
        response = self.client.post(
            f"/savings/{self.saving.saving_id}/deposit/",
            {"amount": "100.00"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "completed")

        self.saving.refresh_from_db()
        self.assertEqual(self.saving.balance, Decimal("100.00"))
        self.assertEqual(self.saving.status, "completed")
        self.assertEqual(self.saving.end_date, timezone.localdate())

        transaction = SavingsTransaction.objects.get(saving=self.saving)
        self.assertEqual(transaction.transaction_type, "deposit")
        self.assertEqual(transaction.amount, Decimal("100.00"))
