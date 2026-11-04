from types import SimpleNamespace
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from .views import ReceiptOCRView


class ReceiptOCRViewTests(SimpleTestCase):
    def test_ocr_response_includes_memo_for_transaction_form(self):
        image = SimpleUploadedFile(
            "receipt.jpg",
            b"image",
            content_type="image/jpeg",
        )
        request = APIRequestFactory().post(
            "/transactions/ocr/",
            {"image": image},
            format="multipart",
        )
        force_authenticate(
            request,
            user=SimpleNamespace(is_authenticated=True),
        )

        receipt_data = {
            "raw_text": "ยอดโอน 250.00\nบันทึกช่วยจำ\nอาหารกลางวัน",
            "parsed": {
                "date": "2026-09-23 17:58",
                "note": {"memo": "อาหารกลางวัน"},
            },
        }

        with (
            patch(
                "transactions.views.read_receipt_data",
                return_value=receipt_data,
            ),
            patch(
                "transactions.views.get_receipt_amount",
                return_value=(250.0, "confirmed_by_ocr"),
            ),
            patch("transactions.views.extract_datetime", return_value=None),
        ):
            response = ReceiptOCRView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["amount"], 250.0)
        self.assertEqual(
            response.data["transaction_datetime"],
            "2026-09-23 17:58",
        )
        self.assertEqual(response.data["memo"], "อาหารกลางวัน")
