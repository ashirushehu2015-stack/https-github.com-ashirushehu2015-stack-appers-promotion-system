"""
Module 2: Virtual Account & Bank Integration.
Satisfies checklist items 2.1–2.10.
"""
import uuid
import hashlib
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from core.models import TimeStampedModel


def generate_va_number():
    """Generate a unique, non-guessable 10-digit virtual account number (2.1)."""
    uid = str(uuid.uuid4()).replace("-", "")
    hashed = hashlib.sha256(uid.encode()).hexdigest()
    numeric = str(int(hashed[:15], 16))[:10].zfill(10)
    return numeric


class VirtualAccount(TimeStampedModel):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("expired", "Expired"),
        ("failed", "Failed"),
    ]

    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="virtual_accounts",
    )
    cycle = models.CharField(max_length=10)           # e.g. "2025"
    account_number = models.CharField(max_length=20, unique=True, default=generate_va_number)
    amount_due = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    expires_at = models.DateTimeField()               # 2.2
    confirmed_at = models.DateTimeField(null=True, blank=True)
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="confirmed_payments",
    )
    manual_justification = models.TextField(blank=True)  # 2.10

    class Meta:
        ordering = ["-created_at"]
        unique_together = [("staff", "cycle")]  # one VA per staff per cycle

    def save(self, *args, **kwargs):
        if not self.pk:
            self.expires_at = timezone.now() + timedelta(days=settings.VA_EXPIRY_DAYS)
            self.amount_due = settings.APPERS_FEE_AMOUNT
        super().save(*args, **kwargs)

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"VA {self.account_number} — {self.staff} [{self.status}]"


class BankTransaction(TimeStampedModel):
    STATUS_CHOICES = [
        ("received", "Received"),
        ("matched", "Matched"),
        ("duplicate", "Duplicate"),
        ("unmatched", "Unmatched"),
        ("rejected", "Rejected"),
    ]

    virtual_account = models.ForeignKey(
        VirtualAccount, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="transactions",
    )
    tx_ref = models.CharField(max_length=100)             # bank reference
    idempotency_key = models.CharField(max_length=200, unique=True)  # 2.5
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    account_number = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="received")
    raw_payload = models.JSONField(default=dict)
    received_at = models.DateTimeField(auto_now_add=True)
    rejection_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-received_at"]

    def __str__(self):
        return f"TXN {self.tx_ref} — {self.amount} [{self.status}]"


class PaymentStatus(TimeStampedModel):
    """D4 — Payment Status store."""
    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payment_statuses",
    )
    cycle = models.CharField(max_length=10)
    paid = models.BooleanField(default=False)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="payment_confirmations",
    )
    virtual_account = models.OneToOneField(
        VirtualAccount, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="payment_status",
    )

    class Meta:
        unique_together = [("staff", "cycle")]

    def __str__(self):
        return f"Payment: {self.staff} cycle={self.cycle} paid={self.paid}"
