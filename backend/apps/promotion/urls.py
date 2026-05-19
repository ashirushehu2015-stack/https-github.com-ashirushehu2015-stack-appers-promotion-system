from django.urls import path
from .views import (
    CheckMyEligibilityView, ProcessPromotionCycleView,
    PromotionCandidatesListView, SubmitDecisionView, ExternalApprovalView
)

urlpatterns = [
    path("my-eligibility/", CheckMyEligibilityView.as_view(), name="my_eligibility"),
    path("cycle/compile/", ProcessPromotionCycleView.as_view(), name="compile_cycle"),
    path("candidates/", PromotionCandidatesListView.as_view(), name="promotion_candidates"),
    path("candidates/<int:decision_id>/decision/", SubmitDecisionView.as_view(), name="submit_decision"),
    path("candidates/<int:decision_id>/external-approval/", ExternalApprovalView.as_view(), name="external_approval"),
]
