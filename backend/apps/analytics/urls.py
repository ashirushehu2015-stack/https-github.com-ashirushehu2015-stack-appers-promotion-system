from django.urls import path
from .views import (
    AnalyticsDashboardView, AuditTrailListView,
    ExportCandidatesCSVView, ExportCandidatesExcelView, ExportCandidateScorecardPDFView
)

urlpatterns = [
    path("analytics/dashboard/", AnalyticsDashboardView.as_view(), name="analytics_dashboard"),
    path("analytics/audit-trail/", AuditTrailListView.as_view(), name="audit_trail"),
    path("analytics/export/csv/", ExportCandidatesCSVView.as_view(), name="export_csv"),
    path("analytics/export/excel/", ExportCandidatesExcelView.as_view(), name="export_excel"),
    path("analytics/export/pdf/<int:decision_id>/", ExportCandidateScorecardPDFView.as_view(), name="export_pdf"),
]
