from django.urls import path
from .views import (
    RequestVirtualAccountView, PaymentStatusView,
    BankWebhookView, AdminPaymentOverrideView, AdminPaymentListView,
)

urlpatterns = [
    path("virtual-accounts/request/", RequestVirtualAccountView.as_view(), name="va_request"),
    path("virtual-accounts/status/", PaymentStatusView.as_view(), name="va_status"),
    path("webhooks/bank/", BankWebhookView.as_view(), name="bank_webhook"),
    path("admin-panel/payments/", AdminPaymentListView.as_view(), name="admin_payments"),
    path("admin-panel/payments/<int:pk>/override/", AdminPaymentOverrideView.as_view(), name="payment_override"),
]
