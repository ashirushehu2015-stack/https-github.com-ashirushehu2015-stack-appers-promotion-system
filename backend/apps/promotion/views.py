"""
Views for Module 5: Promotion Engine.
Supports eligibility list compilation, scoring, routing, and decisions.
"""
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.users.models import User
from apps.evaluation.views import get_active_cycle
from apps.evaluation.models import SelfEvaluation
from apps.superior_eval.models import SuperiorEvaluation
from .models import PromotionDecision
from .serializers import PromotionDecisionSerializer
from .eligibility import check_eligibility
from core.permissions import IsAdmin, IsSuperior
from core.audit import log_action


class CheckMyEligibilityView(APIView):
    """Staff checking their own promotion eligibility maturity status."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        res = check_eligibility(request.user)
        return Response(res)


class ProcessPromotionCycleView(APIView):
    """
    Admin-only: Compile and process candidates for the current active cycle.
    Creates or updates PromotionDecision records with calculations.
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        cycle = get_active_cycle()
        if not cycle:
            return Response({"error": "No active cycle configured."}, status=400)

        # Retrieve all staff with submitted self evaluations
        staff_list = User.objects.filter(role="staff", is_active=True)
        compiled_count = 0

        for staff in staff_list:
            # Check eligibility
            elig = check_eligibility(staff)

            # Get evaluations
            self_eval = SelfEvaluation.objects.filter(staff=staff, cycle=cycle.year, is_submitted=True).first()
            sup_eval = SuperiorEvaluation.objects.filter(subject_staff=staff, cycle=cycle.year, is_submitted=True).first()

            # Skip if no evaluations at all yet (to allow rolling compilation)
            if not self_eval and not sup_eval:
                continue

            self_score = self_eval.total_score if self_eval else 0.0
            sup_score = sup_eval.total_score if sup_eval else 0.0
            
            # Combine scores (simple average of whatever is available)
            scores = []
            if self_eval:
                scores.append(self_score)
            if sup_eval:
                scores.append(sup_score)
            avg_score = sum(scores) / len(scores) if scores else 0.0

            decision_obj, created = PromotionDecision.objects.get_or_create(
                staff=staff,
                cycle=cycle.year,
                defaults={
                    "grade_level_at_eval": staff.grade_level,
                    "years_in_post": elig["years_in_post"],
                    "is_eligible_by_maturity": elig["is_eligible"],
                    "is_csc_route": staff.is_csc_mda,
                    "requires_external_approval": staff.is_csc_mda,
                    "self_score": self_score,
                    "superior_score": sup_score,
                    "average_score": avg_score,
                }
            )

            if not created:
                # Update existing calculations
                decision_obj.self_score = self_score
                decision_obj.superior_score = sup_score
                decision_obj.average_score = avg_score
                decision_obj.is_eligible_by_maturity = elig["is_eligible"]
                decision_obj.years_in_post = elig["years_in_post"]
                decision_obj.save()

            compiled_count += 1

        log_action(
            user=request.user, action="PROMOTION_CALC",
            target_model="PromotionCycle", target_id=cycle.year,
            extra={"compiled_candidates": compiled_count},
            request=request
        )

        return Response({"success": True, "message": f"Successfully compiled/updated {compiled_count} candidates."})


class PromotionCandidatesListView(generics.ListAPIView):
    """List compiled promotion candidates for the cycle (Admin or Superior)."""
    permission_classes = [IsSuperior]
    serializer_class = PromotionDecisionSerializer

    def get_queryset(self):
        cycle = get_active_cycle()
        if not cycle:
            return PromotionDecision.objects.none()

        qs = PromotionDecision.objects.select_related("staff", "decided_by", "external_approver").filter(cycle=cycle.year)

        # If Superior (not Admin), restrict to their own supervisees
        if self.request.user.role == "superior":
            qs = qs.filter(staff__supervisor=self.request.user)

        # Filters
        eligible = self.request.query_params.get("eligible")
        recommendation = self.request.query_params.get("recommendation")
        csc = self.request.query_params.get("is_csc")

        if eligible:
            qs = qs.filter(is_eligible_by_maturity=eligible.lower() == "true")
        if recommendation:
            qs = qs.filter(recommendation=recommendation)
        if csc:
            qs = qs.filter(is_csc_route=csc.lower() == "true")

        return qs


class SubmitDecisionView(APIView):
    """Admin or Superior panel submits official recommendation for promotion."""
    permission_classes = [IsAdmin]

    def post(self, request, decision_id):
        try:
            decision = PromotionDecision.objects.get(pk=decision_id)
        except PromotionDecision.DoesNotExist:
            return Response({"error": "Promotion candidate record not found."}, status=404)

        recommendation = request.data.get("recommendation")
        remarks = request.data.get("remarks", "")

        if recommendation not in ("promote", "retain", "defer"):
            return Response({"error": "Invalid recommendation type."}, status=400)

        old_rec = decision.recommendation
        decision.recommendation = recommendation
        decision.remarks = remarks
        decision.decided_by = request.user
        decision.decided_at = timezone.now()
        decision.save()

        log_action(
            user=request.user, action="PROMOTION_APPROVE",
            target_model="PromotionDecision", target_id=decision.pk,
            old_value=old_rec, new_value=recommendation,
            extra={"remarks": remarks}, request=request
        )

        return Response(PromotionDecisionSerializer(decision).data)


class ExternalApprovalView(APIView):
    """External Approver (e.g. Head of Service / CSC panel) approves/rejects CSC-route promotions."""
    # We will allow Admin or designated external role
    permission_classes = [IsAuthenticated]

    def post(self, request, decision_id):
        user = request.user
        if user.role not in ("admin", "external"):
            return Response({"error": "Only external approvers or system admins can perform this action."}, status=403)

        try:
            decision = PromotionDecision.objects.get(pk=decision_id, is_csc_route=True)
        except PromotionDecision.DoesNotExist:
            return Response({"error": "CSC route candidate record not found."}, status=404)

        status_val = request.data.get("status")
        remarks = request.data.get("remarks", "")

        if status_val not in ("approved", "rejected"):
            return Response({"error": "Invalid external status value."}, status=400)

        old_status = decision.external_status
        decision.external_status = status_val
        decision.external_remarks = remarks
        decision.external_approver = user
        decision.external_action_at = timezone.now()
        decision.requires_external_approval = False if status_val == "approved" else True
        decision.save()

        log_action(
            user=user, action="ADMIN_OVERRIDE",
            target_model="PromotionDecision", target_id=decision.pk,
            old_value=f"external_{old_status}", new_value=f"external_{status_val}",
            extra={"remarks": remarks, "role": user.role}, request=request
        )

        return Response(PromotionDecisionSerializer(decision).data)
