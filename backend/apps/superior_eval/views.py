"""
Views for Module 4: Superior Evaluation.
"""
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.users.models import User
from apps.evaluation.views import get_active_cycle
from .models import SuperiorEvaluation
from .serializers import SuperiorEvaluationSerializer, SubordinateSerializer
from core.audit import log_action
from core.permissions import IsSuperior


class MyStaffListView(APIView):
    """List all staff under this superior's supervision (4.5)."""
    permission_classes = [IsSuperior]

    def get(self, request):
        cycle = get_active_cycle()
        staff = User.objects.filter(
            supervisor=request.user, role="staff", is_active=True
        ).order_by("full_name")
        data = SubordinateSerializer(staff, many=True, context={"cycle": cycle}).data
        return Response(data)


class SuperiorEvaluationView(APIView):
    """Get or submit evaluation for a specific staff member."""
    permission_classes = [IsSuperior]

    def get(self, request, staff_id):
        cycle = get_active_cycle()
        if not cycle:
            return Response({"error": "No active cycle."}, status=400)

        # Scope check: ensure this staff belongs to the superior (4.5)
        try:
            subject = User.objects.get(pk=staff_id, supervisor=request.user)
        except User.DoesNotExist:
            return Response({"error": "Staff not found or not under your supervision."}, status=404)

        eval_obj = SuperiorEvaluation.objects.filter(
            evaluator=request.user, subject_staff=subject, cycle=cycle.year
        ).first()
        return Response(SuperiorEvaluationSerializer(eval_obj).data if eval_obj else {})

    def post(self, request, staff_id):
        cycle = get_active_cycle()
        if not cycle:
            return Response({"error": "No active cycle."}, status=400)
        if timezone.now().date() > cycle.deadline:
            return Response({"error": "Deadline has passed."}, status=400)

        try:
            subject = User.objects.get(pk=staff_id, supervisor=request.user)
        except User.DoesNotExist:
            return Response({"error": "Staff not found or not under your supervision."}, status=404)

        eval_obj, _ = SuperiorEvaluation.objects.get_or_create(
            evaluator=request.user, subject_staff=subject, cycle=cycle.year
        )
        old_data = SuperiorEvaluationSerializer(eval_obj).data

        serializer = SuperiorEvaluationSerializer(eval_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        instance.calculate_score()
        instance.submitted_at = timezone.now()
        instance.is_submitted = True
        instance.save()

        log_action(
            user=request.user, action="EVAL_SUBMIT",
            target_model="SuperiorEvaluation", target_id=instance.pk,
            old_value=str(old_data),
            new_value=str(SuperiorEvaluationSerializer(instance).data),
            request=request,
        )
        return Response(SuperiorEvaluationSerializer(instance).data)
