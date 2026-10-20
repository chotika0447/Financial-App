from contextlib import nullcontext
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from .models import Debts
from .views import DebtListCreateView


class LinkedDebtCreationTests(SimpleTestCase):
    def test_creates_linked_debt_for_borrowing_and_lending(self):
        for debt_type, paired_type in (
            ("borrowed", "lent"),
            ("lent", "borrowed"),
        ):
            with self.subTest(debt_type=debt_type):
                owner = MagicMock()
                owner.pk = 1
                owner.is_authenticated = True
                owner.__str__.return_value = "Debt owner"

                friend = MagicMock()
                friend.pk = 2

                debt = MagicMock()
                debt.pk = 10
                debt.type = debt_type
                debt.name = "Shared debt"
                debt.total_amount = "1000.00"
                debt.payment_type = "flexible"
                debt.payment_amount = None
                debt.due_date = "2026-12-31"
                debt.payment_date = None
                debt.note = ""
                debt.icon = "school"
                debt.color = "purple"
                debt.image = None

                paired_debt = MagicMock()
                paired_debt.pk = 11
                serializer = MagicMock()
                serializer.validated_data = {"counterparty": friend}
                serializer.save.return_value = debt
                response_serializer = MagicMock()
                response_serializer.data = {"id": debt.pk}

                request = APIRequestFactory().post(
                    "/debts/",
                    {
                        "name": debt.name,
                        "counterparty": friend.pk,
                        "counterparty_name": "Debt friend",
                        "type": debt_type,
                        "total_amount": debt.total_amount,
                        "payment_type": debt.payment_type,
                        "due_date": debt.due_date,
                    },
                    format="json",
                )
                force_authenticate(request, user=owner)

                with (
                    patch(
                        "debts.views.DebtSerializer",
                        side_effect=[serializer, response_serializer],
                    ),
                    patch(
                        "debts.views.Debts.objects.create",
                        return_value=paired_debt,
                    ) as create_paired_debt,
                    patch("debts.views.transaction.atomic", return_value=nullcontext()),
                    patch("debts.views.transaction.on_commit"),
                ):
                    response = DebtListCreateView.as_view()(request)

                self.assertEqual(response.status_code, 201)
                create_paired_debt.assert_called_once()
                self.assertEqual(
                    create_paired_debt.call_args.kwargs["counterparty_name"],
                    str(owner),
                )
                self.assertEqual(
                    create_paired_debt.call_args.kwargs["type"],
                    paired_type,
                )
                self.assertEqual(debt.paired_debt, paired_debt)
                self.assertEqual(paired_debt.paired_debt, debt)
