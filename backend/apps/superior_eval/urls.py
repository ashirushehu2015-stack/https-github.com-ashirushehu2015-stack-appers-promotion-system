from django.urls import path
from .views import MyStaffListView, SuperiorEvaluationView

urlpatterns = [
    path("subordinates/", MyStaffListView.as_view(), name="my_subordinates"),
    path("evaluate/<int:staff_id>/", SuperiorEvaluationView.as_view(), name="evaluate_staff"),
]
