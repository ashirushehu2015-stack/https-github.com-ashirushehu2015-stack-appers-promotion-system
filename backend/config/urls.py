from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health(request):
    return JsonResponse({"status": "ok", "system": "APPERS"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health),

    # Module 1 – Authentication & Users
    path("api/auth/", include("apps.users.urls")),

    # Module 2 – Virtual Accounts & Bank
    path("api/", include("apps.virtual_accounts.urls")),

    # Module 3 – Evaluation Form
    path("api/evaluation/", include("apps.evaluation.urls")),

    # Module 4 – Superior Evaluation
    path("api/superior/", include("apps.superior_eval.urls")),

    # Module 5 – Promotion Management
    path("api/promotion/", include("apps.promotion.urls")),

    # Module 6 – Analytics & Reporting
    path("api/", include("apps.analytics.urls")),

    # Module 7 – Admin Module
    path("api/admin-panel/", include("apps.admin_module.urls")),
]
