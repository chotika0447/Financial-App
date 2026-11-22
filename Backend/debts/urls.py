from django.urls import path
from .views import (
    DebtListCreateView,
    DebtDetailView,
    PaymentListCreateView,
    PaymentDetailView,
    SendDebtReminderView,
    SendPaymentApprovalRequestView,
    FinHealthBorrowView
)
from .cron_views import trigger_debt_reminders

urlpatterns = [
    # หนี้
    path('',DebtListCreateView.as_view(),name='debt-list-create'),
    path('<int:debt_id>/',DebtDetailView.as_view(),name='debt-detail'),

    # การชำระหนี้
    path('<int:debt_id>/payments/',PaymentListCreateView.as_view(),name='payment-list-create'),
    path('payments/<int:payment_id>/',PaymentDetailView.as_view(),name='payment-detail'),

    # การแจ้งเตือนชำระหนี้
    path("<int:debt_id>/send-reminder/", SendDebtReminderView.as_view(), name="debt-send-reminder"),
    # เพิ่ม API สำหรับ GitHub Actions เพื่อให้เรียกรายการแจ้งเตือนที่บันทึกไว้อัตโนมัติ
    path("cron/send-reminders/", trigger_debt_reminders, name="trigger-debt-reminders",),

    #ส่งข้อมูลหนี้สินไปคำนวณคะแนน
    path('financial-health/borrow/', FinHealthBorrowView.as_view(), name='financial-health-borrow'),

    # ส่งคำขออนุมัติการชำระหนี้ไปหาเจ้าหนี้
    path('payments/<int:payment_id>/send-request/', SendPaymentApprovalRequestView.as_view(), name='send-payment-approval-request'),
]

