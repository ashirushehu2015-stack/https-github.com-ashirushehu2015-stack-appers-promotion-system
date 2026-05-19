"""
Module 1: User Management
Custom User model with RBAC roles, GL level, MDA, password policy,
login lockout, and 2FA readiness.
Satisfies checklist items 1.1–1.12.
"""
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from encrypted_model_fields.fields import EncryptedCharField
from core.models import TimeStampedModel


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("role", "admin")
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    ROLE_CHOICES = [
        ("staff", "Staff"),
        ("superior", "Superior Officer"),
        ("admin", "Administrator"),
        ("external", "External Approver"),
    ]

    # Personal info — encrypted at rest (checklist 1.7)
    full_name = EncryptedCharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)

    # Organisational
    grade_level = EncryptedCharField(max_length=10)   # e.g. "07"
    department = EncryptedCharField(max_length=255)
    mda = EncryptedCharField(max_length=255)           # Ministry/Dept/Agency
    is_csc_mda = models.BooleanField(default=False)    # Civil Service Commission MDA
    institution = models.CharField(max_length=255, blank=True)  # Tertiary institution

    # Promotion history
    last_promotion_date = models.DateField(null=True, blank=True)

    # Role & access
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="staff")
    supervisor = models.ForeignKey(
        "self", null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="subordinates",
        limit_choices_to={"role": "superior"},
    )

    # Django internals
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # Password policy (checklist 1.3)
    password_changed_at = models.DateTimeField(null=True, blank=True)

    # Login lockout (checklist 1.12)
    failed_login_count = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    # 2FA (checklist 1.2) — managed via django-otp TOTP device
    totp_verified = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name", "grade_level", "department", "mda"]

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.email} ({self.role})"

    # ── Login lockout helpers ────────────────────────────────────────
    def is_locked(self):
        if self.locked_until and timezone.now() < self.locked_until:
            return True
        return False

    def record_failed_login(self):
        self.failed_login_count += 1
        if self.failed_login_count >= settings.MAX_LOGIN_ATTEMPTS:
            self.locked_until = timezone.now() + timedelta(
                minutes=settings.ACCOUNT_LOCKOUT_MINUTES
            )
        self.save(update_fields=["failed_login_count", "locked_until"])

    def reset_login_attempts(self):
        self.failed_login_count = 0
        self.locked_until = None
        self.save(update_fields=["failed_login_count", "locked_until"])

    # ── Password expiry helpers ──────────────────────────────────────
    def is_password_expired(self):
        if not self.password_changed_at:
            return True  # force change on first login
        expiry = self.password_changed_at + timedelta(days=settings.PASSWORD_EXPIRY_DAYS)
        return timezone.now() > expiry

    def mark_password_changed(self):
        self.password_changed_at = timezone.now()
        self.save(update_fields=["password_changed_at"])

    # ── 2FA required ────────────────────────────────────────────────
    def requires_2fa(self):
        return self.role in ("admin", "superior")
