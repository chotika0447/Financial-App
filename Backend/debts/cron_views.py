import logging
import secrets

from django.conf import settings
from django.core.management import call_command
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def trigger_debt_reminders(request):
    expected_token = getattr(settings, "DEBT_REMINDER_CRON_TOKEN", "")
    provided_token = request.headers.get("X-Cron-Token", "")

    if not expected_token or not secrets.compare_digest(
        provided_token, expected_token
    ):
        return JsonResponse(
            {"detail": "Unauthorized"},
            status=401,
        )

    try:
        call_command("send_debt_reminders")

        return JsonResponse({
            "success": True,
            "message": "Debt reminder check completed",
        })

    except Exception:
        logger.exception("Debt reminder scheduled job failed")

        return JsonResponse(
            {
                "success": False,
                "message": "Debt reminder job failed",
            },
            status=500,
        )
