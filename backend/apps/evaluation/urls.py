from django.urls import path
from .views import EvaluationAccessView, SubmitEvaluationView, ActiveCycleView

urlpatterns = [
    path("access/", EvaluationAccessView.as_view(), name="eval_access"),
    path("submit/", SubmitEvaluationView.as_view(), name="eval_submit"),
    path("my/", SubmitEvaluationView.as_view(), name="eval_my"),
    path("cycle/", ActiveCycleView.as_view(), name="active_cycle"),
]
