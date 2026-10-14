
from django.db import transaction
from django.utils import timezone

from .models import Transaction, TransactionDraft


# ใช้ยืนยันรายการได้ทั้ง LINE OA และเว็บไซต์
def confirm_transaction_draft(draft_id, user):

    with transaction.atomic():

        try:
            draft = TransactionDraft.objects.select_for_update().get(
                id=draft_id,
                user=user
            )

        except TransactionDraft.DoesNotExist:
            return None, "ไม่พบรายการร่าง"

        if draft.status != "pending":
            return None, "รายการนี้ถูกยืนยันหรือยกเลิกแล้ว"

        if draft.amount is None or draft.amount <= 0:
            return None, "กรุณาระบุจำนวนเงินให้ถูกต้อง"

        if draft.transaction_type not in ["income", "expense"]:
            return None, "กรุณาเลือกประเภทรายรับหรือรายจ่าย"

        if draft.category is not None:
            if draft.category.transaction_type != draft.transaction_type:
                return None, "หมวดหมู่ไม่ตรงกับประเภทรายการ"

        # ใช้วันที่ปัจจุบัน หาก Draft ยังไม่มีวันที่
        date_value = draft.transaction_date

        if date_value is None:
            date_value = timezone.localdate()

        # สร้าง Transaction จริงเพียงครั้งเดียว
        new_transaction = Transaction.objects.create(
            user=user,
            amount=draft.amount,
            transaction_type=draft.transaction_type,
            description=draft.description,
            category=draft.category,
            sub_category=draft.sub_category,
            account=draft.account,
            transaction_date=date_value,
            transaction_time=draft.transaction_time,
            receipt=draft.receipt.name if draft.receipt else None
        )

        draft.status = "confirmed"
        draft.save(update_fields=["status"])

        return new_transaction, None
