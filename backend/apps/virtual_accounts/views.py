"""
Views for Module 2: Virtual Accounts & Bank Webhooks.
"""
import hmac
import hashlib
import json
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import VirtualAccount, BankTransaction, PaymentStatus
from .serializers import VirtualAccountSerializer, PaymentStatusSerializer, BankTransactionSerializer
from .tasks import notify_payment_confirmed, notify_payment_rejected
from core.permissions import IsAdmin, IsStaff
from core.audit import log_action


def get_current_cycle():
    return str(timezone.now().year)


# ── Staff: Request Virtual Account ────────────────────────────────────────────

class RequestVirtualAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cycle = get_current_cycle()
        user = request.user

        # Check if already has a valid (non-expired) confirmed VA
        existing = VirtualAccount.objects.filter(
            staff=user, cycle=cycle, status="confirmed"
        ).first()
        if existing:
            return Response({"error": "Payment already confirmed for this cycle."}, status=400)

        # If there's a pending non-expired VA, return it
        active = VirtualAccount.objects.filter(
            staff=user, cycle=cycle, status="pending"
        ).first()
        if active and not active.is_expired():
            return Response(VirtualAccountSerializer(active).data)

        # Create new VA (handles expired old one via unique_together by deleting old)
        VirtualAccount.objects.filter(staff=user, cycle=cycle).delete()
        va = VirtualAccount.objects.create(staff=user, cycle=cycle)

        # Ensure PaymentStatus record exists
        PaymentStatus.objects.get_or_create(
            staff=user, cycle=cycle,
            defaults={"virtual_account": va}
        )

        return Response(VirtualAccountSerializer(va).data, status=status.HTTP_201_CREATED)


# ── Staff: Check Payment Status ───────────────────────────────────────────────

class PaymentStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cycle = get_current_cycle()
        try:
            ps = PaymentStatus.objects.get(staff=request.user, cycle=cycle)
            return Response(PaymentStatusSerializer(ps).data)
        except PaymentStatus.DoesNotExist:
            return Response({"paid": False, "status": "No virtual account requested yet."})


# ── Bank Webhook ──────────────────────────────────────────────────────────────

@method_decorator(csrf_exempt, name="dispatch")
class BankWebhookView(APIView):
    """Receives bank payment push notifications (2.3)."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        # Signature verification (2.3)
        sig_header = request.headers.get("X-Bank-Signature", "")
        body = request.body
        expected = hmac.new(
            settings.BANK_WEBHOOK_SECRET.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig_header, expected):
            return Response({"error": "Invalid signature."}, status=403)

        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            return Response({"error": "Invalid JSON."}, status=400)

        account_number = payload.get("account_number")
        amount = Decimal(str(payload.get("amount", 0)))
        tx_ref = payload.get("tx_ref", "")
        idempotency_key = f"{tx_ref}:{account_number}"

        # Idempotency check (2.5)
        if BankTransaction.objects.filter(idempotency_key=idempotency_key).exists():
            return Response({"status": "duplicate", "message": "Already processed."})

        # Find VA
        try:
            va = VirtualAccount.objects.get(account_number=account_number, status="pending")
        except VirtualAccount.DoesNotExist:
            BankTransaction.objects.create(
                tx_ref=tx_ref,
                idempotency_key=idempotency_key,
                amount=amount,
                account_number=account_number,
                status="unmatched",
                raw_payload=payload,
            )
            return Response({"status": "unmatched"})

        # Expired account
        if va.is_expired():
            va.status = "expired"
            va.save()
            return Response({"status": "expired"})

        # Partial/overpayment check (2.6)
        if amount != va.amount_due:
            BankTransaction.objects.create(
                virtual_account=va,
                tx_ref=tx_ref,
                idempotency_key=idempotency_key,
                amount=amount,
                account_number=account_number,
                status="rejected",
                rejection_reason=f"Expected {va.amount_due}, got {amount}",
                raw_payload=payload,
            )
            va.status = "failed"
            va.save()
            notify_payment_rejected.delay(va.staff_id, f"Expected ₦{va.amount_due}, received ₦{amount}.")
            return Response({"status": "rejected", "reason": "Amount mismatch"})

        # Confirm payment
        BankTransaction.objects.create(
            virtual_account=va,
            tx_ref=tx_ref,
            idempotency_key=idempotency_key,
            amount=amount,
            account_number=account_number,
            status="matched",
            raw_payload=payload,
        )
        va.status = "confirmed"
        va.confirmed_at = timezone.now()
        va.save()

        ps, _ = PaymentStatus.objects.get_or_create(
            staff=va.staff, cycle=va.cycle,
            defaults={"virtual_account": va}
        )
        ps.paid = True
        ps.confirmed_at = timezone.now()
        ps.virtual_account = va
        ps.save()

        log_action(action="PAYMENT_STATUS_CHANGE", target_model="VirtualAccount",
                   target_id=va.pk, old_value="pending", new_value="confirmed",
                   extra={"tx_ref": tx_ref})
        notify_payment_confirmed.delay(va.staff_id, va.cycle)

        return Response({"status": "confirmed"})


# ── Admin: Manual Payment Override ───────────────────────────────────────────

class AdminPaymentOverrideView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            va = VirtualAccount.objects.get(pk=pk)
        except VirtualAccount.DoesNotExist:
            return Response({"error": "Not found."}, status=404)

        justification = request.data.get("justification", "").strip()
        if not justification:
            return Response({"error": "Justification is required."}, status=400)

        old_status = va.status
        va.status = "confirmed"
        va.confirmed_at = timezone.now()
        va.confirmed_by = request.user
        va.manual_justification = justification
        va.save()

        ps, _ = PaymentStatus.objects.get_or_create(
            staff=va.staff, cycle=va.cycle,
            defaults={"virtual_account": va}
        )
        ps.paid = True
        ps.confirmed_at = timezone.now()
        ps.confirmed_by = request.user
        ps.virtual_account = va
        ps.save()

        log_action(
            user=request.user, action="PAYMENT_MANUAL_CONFIRM",
            target_model="VirtualAccount", target_id=va.pk,
            old_value=old_status, new_value="confirmed",
            extra={"justification": justification}, request=request,
        )
        notify_payment_confirmed.delay(va.staff_id, va.cycle)
        return Response({"success": True, "message": "Payment manually confirmed."})


# ── Admin: List All Payments ──────────────────────────────────────────────────

class AdminPaymentListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = PaymentStatusSerializer

    def get_queryset(self):
        qs = PaymentStatus.objects.select_related("staff", "virtual_account").all()
        cycle = self.request.query_params.get("cycle")
        paid = self.request.query_params.get("paid")
        if cycle:
            qs = qs.filter(cycle=cycle)
        if paid is not None:
            qs = qs.filter(paid=paid.lower() == "true")
        return qs
