from django.urls import path
from .views import (
    AdminPromotionCycleListCreateView, AdminPromotionCycleDetailView,
    PromotionRuleListCreateView, PromotionRuleDetailView,
    ManualReconcileTransactionsView
)

urlpatterns = [
    path("cycles/", AdminPromotionCycleListCreateView.as_view(), name="admin_cycles"),
    path("cycles/<int:pk>/", AdminPromotionCycleDetailView.as_view(), name="admin_cycle_detail"),
    path("rules/", PromotionRuleListCreateView.as_view(), name="admin_rules"),
    path("rules/<int:pk>/", PromotionRuleDetailView.as_view(), name="admin_rule_detail"),
    path("transactions/reconcile/", ManualReconcileTransactionsView.as_view(), name="admin_reconcile"),
]
