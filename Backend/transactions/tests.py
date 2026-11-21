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
            b"fake-image-for-mocked-ocr",
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

        parsed_data = {
            "date": "2026-09-23",
            "time": "17:58",
            "amount": "250.00",
            "note": {"memo": "อาหารกลางวัน"},
            "needs_review": False,
            "ocr_text": ["ยอดโอน 250.00"],
        }

        with (
            patch(
                "transactions.views.upload_receipt",
                return_value="receipts/test.jpg",
            ),
            patch(
                "transactions.views.get_receipt_signed_url",
                return_value="https://example.com/test.jpg",
            ),
            patch(
                "transactions.views.run_ocr",
                return_value=["mock-ocr-result"],
            ),
            patch(
                "transactions.views.parse_slip",
                return_value=parsed_data,
            ),
            patch("transactions.views.delete_receipt"),
        ):
            response = ReceiptOCRView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            float(response.data["amount"]),
            250.0,
        )
        self.assertEqual(
            response.data["date"],
            "2026-09-23",
        )
        self.assertEqual(
            response.data["time"],
            "17:58",
        )
        self.assertEqual(
            response.data["note"]["memo"],
            "อาหารกลางวัน",
        )

class ReceiptOCRCurrentFlowTests(SimpleTestCase):

    def test_ocr_returns_parsed_receipt(self):
        image = SimpleUploadedFile(
            "receipt.jpg",
            b"fake-image-for-mocked-ocr",
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

        parsed_data = {
            "date": "2026-09-23",
            "time": "17:58",
            "amount": 250.0,
            "note": {"memo": "อาหารกลางวัน"},
            "needs_review": False,
            "ocr_text": ["ยอดโอน 250.00"],
        }

        with (
            patch(
                "transactions.views.upload_receipt",
                return_value="receipts/test.jpg",
            ),
            patch(
                "transactions.views.get_receipt_signed_url",
                return_value="https://example.com/test.jpg",
            ),
            patch(
                "transactions.views.run_ocr",
                return_value=["mock-ocr-result"],
            ),
            patch(
                "transactions.views.parse_slip",
                return_value=parsed_data,
            ),
            patch("transactions.views.delete_receipt"),
        ):
            response = ReceiptOCRView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["amount"], 250.0)
        self.assertEqual(response.data["date"], "2026-09-23")
        self.assertEqual(response.data["time"], "17:58")
        self.assertEqual(
            response.data["note"]["memo"],
            "อาหารกลางวัน",
        )
        self.assertFalse(response.data["needs_review"])


class ReceiptOCRValidationTests(SimpleTestCase):

    def make_request(self, image=None):
        data = {"image": image} if image else {}

        request = APIRequestFactory().post(
            "/transactions/ocr/",
            data,
            format="multipart",
        )

        force_authenticate(
            request,
            user=SimpleNamespace(is_authenticated=True),
        )

        return ReceiptOCRView.as_view()(request)

    def test_missing_image(self):
        response = self.make_request()

        self.assertEqual(response.status_code, 400)

    def test_invalid_file_type(self):
        image = SimpleUploadedFile(
            "document.pdf",
            b"fake-pdf",
            content_type="application/pdf",
        )

        response = self.make_request(image)

        self.assertEqual(response.status_code, 400)

    def test_file_larger_than_5mb(self):
        image = SimpleUploadedFile(
            "large.jpg",
            b"x" * (5 * 1024 * 1024 + 1),
            content_type="image/jpeg",
        )

        response = self.make_request(image)

        self.assertEqual(response.status_code, 400)
