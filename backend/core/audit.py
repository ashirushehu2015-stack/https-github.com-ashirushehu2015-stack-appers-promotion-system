"""
AuditLog model — records every sensitive action in the system.
Satisfies checklist items 1.5 and 1.6.
"""
from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    ACTION_CHOICES = [
        ("LOGIN", "Login"),
        ("LOGOUT", "Logout"),
        ("LOGIN_FAILED", "Login Failed"),
        ("REGISTER", "Register"),
        ("PASSWORD_CHANGE", "Password Change"),
        ("PAYMENT_STATUS_CHANGE", "Payment Status Change"),
        ("PAYMENT_MANUAL_CONFIRM", "Payment Manual Confirmation"),
        ("FORM_SUBMIT", "Form Submission"),
        ("EVAL_SUBMIT", "Evaluation Submission"),
        ("PROMOTION_CALC", "Promotion Calculation"),
        ("PROMOTION_APPROVE", "Promotion Approved"),
        ("ADMIN_OVERRIDE", "Admin Override"),
        ("RULE_UPDATE", "Promotion Rule Updated"),
        ("USER_CREATED", "User Created"),
        ("USER_UPDATED", "User Updated"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    target_model = models.CharField(max_length=100, blank=True)
    target_id = models.CharField(max_length=100, blank=True)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    extra = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["user", "timestamp"]),
            models.Index(fields=["action", "timestamp"]),
        ]

    def __str__(self):
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {self.action} by {self.user_id}"


def log_action(
    user=None,
    action="",
    target_model="",
    target_id="",
    old_value="",
    new_value="",
    ip_address=None,
    request=None,
    extra=None,
):
    """Convenience function to create an AuditLog entry."""
    if request and not ip_address:
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        ip_address = xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR")
    ua = request.META.get("HTTP_USER_AGENT", "") if request else ""
    AuditLog.objects.create(
        user=user,
        action=action,
        target_model=target_model,
        target_id=str(target_id),
        old_value=str(old_value),
        new_value=str(new_value),
        ip_address=ip_address,
        user_agent=ua[:512],
        extra=extra or {},
    )
