"""
Views for Module 7: Admin Module.
Provides full control over promotion cycle parameters, rules, and system overrides.
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone

from apps.evaluation.models import PromotionCycle
from apps.virtual_accounts.models import VirtualAccount, BankTransaction, PaymentStatus
from apps.virtual_accounts.tasks import notify_payment_confirmed
from .models import PromotionRule
from .serializers import AdminPromotionCycleSerializer, PromotionRuleSerializer
from core.permissions import IsAdmin
from core.audit import log_action


class AdminPromotionCycleListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminPromotionCycleSerializer
    queryset = PromotionCycle.objects.all().order_by("-year")

    def perform_create(self, serializer):
        # If is_active is True, deactivate all other cycles
        if serializer.validated_data.get("is_active", False):
            PromotionCycle.objects.filter(is_active=True).update(is_active=False)
        cycle = serializer.save()
        log_action(
            user=self.request.user, action="RULE_UPDATE",
            target_model="PromotionCycle", target_id=cycle.year,
            new_value=str(serializer.data), request=self.request
        )


class AdminPromotionCycleDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminPromotionCycleSerializer
    queryset = PromotionCycle.objects.all()

    def perform_update(self, serializer):
        if serializer.validated_data.get("is_active", False):
            PromotionCycle.objects.filter(is_active=True).exclude(pk=self.get_object().pk).update(is_active=False)
        old = AdminPromotionCycleSerializer(self.get_object()).data
        cycle = serializer.save()
        log_action(
            user=self.request.user, action="RULE_UPDATE",
            target_model="PromotionCycle", target_id=cycle.year,
            old_value=str(old), new_value=str(serializer.data),
            request=self.request
        )


class PromotionRuleListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = PromotionRuleSerializer
    queryset = PromotionRule.objects.all()

    def perform_create(self, serializer):
        rule = serializer.save()
        log_action(
            user=self.request.user, action="RULE_UPDATE",
            target_model="PromotionRule", target_id=rule.pk,
            new_value=str(serializer.data), request=self.request
        )


class PromotionRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = PromotionRuleSerializer
    queryset = PromotionRule.objects.all()

    def perform_update(self, serializer):
        old = PromotionRuleSerializer(self.get_object()).data
        rule = serializer.save()
        log_action(
            user=self.request.user, action="RULE_UPDATE",
            target_model="PromotionRule", target_id=rule.pk,
            old_value=str(old), new_value=str(serializer.data),
            request=self.request
        )


class ManualReconcileTransactionsView(APIView):
    """
    Scans for unmatched transactions and tries to match them with newly created
    virtual accounts or manually resolves them.
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        unmatched = BankTransaction.objects.filter(status="unmatched")
        reconciled_count = 0

        for tx in unmatched:
            # Check if active VA exists for this account number now
            va = VirtualAccount.objects.filter(account_number=tx.account_number, status="pending").first()
            if va and not va.is_expired() and tx.amount == va.amount_due:
                # Reconcile!
                tx.virtual_account = va
                tx.status = "matched"
                tx.save()

                va.status = "confirmed"
                va.confirmed_at = timezone.now()
                va.save()

                ps, _ = PaymentStatus.objects.get_or_create(
                    staff=va.staff, cycle=va.cycle,
                    defaults={"virtual_account": va}
                )
                ps.paid = True
                ps.confirmed_at = timezone.now()
                ps.save()

                log_action(
                    user=request.user, action="PAYMENT_STATUS_CHANGE",
                    target_model="VirtualAccount", target_id=va.pk,
                    old_value="pending", new_value="confirmed",
                    extra={"tx_ref": tx.tx_ref, "method": "manual_reconcile"},
                    request=request
                )
                notify_payment_confirmed.delay(va.staff_id, va.cycle)
                reconciled_count += 1

        return Response({
            "success": True,
            "message": f"Scanned unmatched transactions. Reconciled {reconciled_count} payments."
        })
