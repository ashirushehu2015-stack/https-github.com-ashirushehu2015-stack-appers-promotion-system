"""
Celery tasks for Module 2: Virtual Accounts.
- Expire stale virtual accounts (2.2)
- Periodic bank statement polling (2.4)
"""
from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings


@shared_task
def expire_virtual_accounts():
    """Mark all expired pending VAs as 'expired'. Runs daily."""
    from .models import VirtualAccount
    expired = VirtualAccount.objects.filter(
        status="pending", expires_at__lt=timezone.now()
    )
    count = expired.update(status="expired")
    return f"Expired {count} virtual accounts."


@shared_task
def poll_bank_statements():
    """
    Placeholder for scheduled bank statement import (2.4).
    In production: connect to bank SFTP/API, parse transactions,
    call process_bank_transaction() for each.
    """
    # TODO: Implement real bank API polling when bank credentials are provided.
    return "Bank statement poll completed (mock)."


@shared_task
def notify_payment_confirmed(staff_id, cycle):
    """Send email to staff when payment is confirmed."""
    from apps.users.models import User
    try:
        user = User.objects.get(pk=staff_id)
        send_mail(
            subject="APPERS Payment Confirmed",
            message=(
                f"Dear {user.full_name},\n\n"
                f"Your APPERS fee payment for cycle {cycle} has been confirmed.\n"
                f"You may now access and fill your evaluation form.\n\n"
                f"APPERS System"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception:
        pass


@shared_task
def notify_payment_rejected(staff_id, reason):
    """Notify staff of payment rejection (partial/overpayment)."""
    from apps.users.models import User
    try:
        user = User.objects.get(pk=staff_id)
        send_mail(
            subject="APPERS Payment Issue — Action Required",
            message=(
                f"Dear {user.full_name},\n\n"
                f"Your payment could not be confirmed. Reason: {reason}\n"
                f"Please pay the exact amount and contact support if needed.\n\n"
                f"APPERS System"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception:
        pass
