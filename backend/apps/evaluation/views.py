"""
Views for Module 3: Evaluation Form.
"""
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.virtual_accounts.models import PaymentStatus
from .models import SelfEvaluation, PromotionCycle, ASPECTS
from .serializers import SelfEvaluationSerializer, PromotionCycleSerializer
from core.audit import log_action
from core.permissions import IsAdmin


def get_active_cycle():
    return PromotionCycle.objects.filter(is_active=True).order_by("-year").first()


class EvaluationAccessView(APIView):
    """Check if the authenticated staff can access the form (4.1)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cycle = get_active_cycle()
        if not cycle:
            return Response({"access": False, "reason": "No active promotion cycle."})

        if timezone.now().date() > cycle.deadline:
            return Response({"access": False, "reason": "Submission deadline has passed."})

        try:
            ps = PaymentStatus.objects.get(staff=request.user, cycle=cycle.year)
            if not ps.paid:
                return Response({"access": False, "reason": "Payment not confirmed."})
        except PaymentStatus.DoesNotExist:
            return Response({"access": False, "reason": "No payment record found."})

        existing = SelfEvaluation.objects.filter(
            staff=request.user, cycle=cycle.year, is_submitted=True
        ).first()
        return Response({
            "access": True,
            "cycle": cycle.year,
            "deadline": cycle.deadline,
            "already_submitted": existing is not None,
        })


class SubmitEvaluationView(APIView):
    """Submit or update a self-evaluation form (4.1–4.3)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cycle = get_active_cycle()
        if not cycle:
            return Response({"error": "No active cycle."}, status=400)
        if timezone.now().date() > cycle.deadline:
            return Response({"error": "Deadline has passed."}, status=400)

        # Payment gate
        try:
            ps = PaymentStatus.objects.get(staff=request.user, cycle=cycle.year)
            if not ps.paid:
                return Response({"error": "Payment not confirmed."}, status=403)
        except PaymentStatus.DoesNotExist:
            return Response({"error": "No payment found."}, status=403)

        eval_obj, _ = SelfEvaluation.objects.get_or_create(
            staff=request.user, cycle=cycle.year
        )
        serializer = SelfEvaluationSerializer(eval_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        instance.calculate_score()
        instance.submitted_at = timezone.now()
        instance.is_submitted = True
        instance.save()

        log_action(user=request.user, action="FORM_SUBMIT",
                   target_model="SelfEvaluation", target_id=instance.pk,
                   request=request)
        return Response(SelfEvaluationSerializer(instance).data, status=status.HTTP_200_OK)

    def get(self, request):
        cycle = get_active_cycle()
        if not cycle:
            return Response({"error": "No active cycle."}, status=400)
        try:
            eval_obj = SelfEvaluation.objects.get(staff=request.user, cycle=cycle.year)
            return Response(SelfEvaluationSerializer(eval_obj).data)
        except SelfEvaluation.DoesNotExist:
            return Response({})


class ActiveCycleView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cycle = get_active_cycle()
        if not cycle:
            return Response({"error": "No active cycle."}, status=404)
        return Response(PromotionCycleSerializer(cycle).data)
