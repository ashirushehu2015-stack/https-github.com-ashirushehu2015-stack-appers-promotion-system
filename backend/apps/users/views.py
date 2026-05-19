"""
Views for Module 1: User Management.
Handles register, login, 2FA, logout, password change, profile.
"""
import pyotp
import qrcode
import io
import base64
from django.utils import timezone
from django.conf import settings
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django_otp.plugins.otp_totp.models import TOTPDevice

from .models import User
from .serializers import (
    RegisterSerializer, LoginSerializer,
    UserProfileSerializer, PasswordChangeSerializer,
    UserAdminSerializer,
)
from core.audit import log_action
from core.permissions import IsAdmin


# ── Registration ─────────────────────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_action(user=user, action="REGISTER", request=request)
        return Response(
            {"success": True, "message": "Account created. Please log in."},
            status=status.HTTP_201_CREATED,
        )


# ── Login ────────────────────────────────────────────────────────────────────

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        # Check lockout before validating password
        email = request.data.get("email", "")
        try:
            user_obj = User.objects.get(email=email)
            if user_obj.is_locked():
                return Response(
                    {"success": False, "error": "Account temporarily locked. Try again later."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        except User.DoesNotExist:
            pass

        if not serializer.is_valid():
            # Record failed attempt
            try:
                user_obj = User.objects.get(email=email)
                user_obj.record_failed_login()
                log_action(user=user_obj, action="LOGIN_FAILED", request=request)
            except User.DoesNotExist:
                pass
            return Response(
                {"success": False, "error": serializer.errors},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = serializer.validated_data["user"]
        user.reset_login_attempts()

        # Password expiry check
        if user.is_password_expired():
            log_action(user=user, action="LOGIN", request=request,
                       extra={"password_expired": True})
            return Response(
                {"success": False, "password_expired": True,
                 "error": "Password expired. Please change your password."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 2FA check for admin/superior
        if user.requires_2fa():
            # Issue a short-lived pre-auth token (no full access yet)
            log_action(user=user, action="LOGIN", request=request,
                       extra={"2fa_required": True})
            return Response({
                "success": True,
                "2fa_required": True,
                "pre_auth_user_id": user.pk,
                "message": "Please verify your 2FA code.",
            })

        # Full login — issue tokens
        refresh = RefreshToken.for_user(user)
        log_action(user=user, action="LOGIN", request=request)
        return Response({
            "success": True,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserProfileSerializer(user).data,
        })


# ── 2FA Setup ────────────────────────────────────────────────────────────────

class TOTPSetupView(APIView):
    """Returns QR code URI for initial TOTP setup."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        device, created = TOTPDevice.objects.get_or_create(
            user=user, name="APPERS Authenticator", confirmed=False
        )
        uri = device.config_url
        # Generate QR as base64 PNG
        img = qrcode.make(uri)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        qr_b64 = base64.b64encode(buf.getvalue()).decode()
        return Response({"qr_image": f"data:image/png;base64,{qr_b64}", "uri": uri})


class TOTPVerifyView(APIView):
    """Verify TOTP token and complete login / confirm device setup."""
    permission_classes = [AllowAny]

    def post(self, request):
        user_id = request.data.get("user_id")
        token = request.data.get("token")
        try:
            user = User.objects.get(pk=user_id, is_active=True)
        except User.DoesNotExist:
            return Response({"error": "Invalid request."}, status=400)

        device = TOTPDevice.objects.filter(user=user).first()
        if not device or not device.verify_token(token):
            return Response({"error": "Invalid or expired 2FA code."}, status=400)

        # Confirm device if not already
        if not device.confirmed:
            device.confirmed = True
            device.save()
            user.totp_verified = True
            user.save(update_fields=["totp_verified"])

        refresh = RefreshToken.for_user(user)
        log_action(user=user, action="LOGIN", request=request, extra={"2fa": "verified"})
        return Response({
            "success": True,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserProfileSerializer(user).data,
        })


# ── Logout ───────────────────────────────────────────────────────────────────

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            log_action(user=request.user, action="LOGOUT", request=request)
            return Response({"success": True, "message": "Logged out."})
        except TokenError:
            return Response({"error": "Invalid token."}, status=400)


# ── Password Change ───────────────────────────────────────────────────────────

class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response({"error": "Old password is incorrect."}, status=400)
        user.set_password(serializer.validated_data["new_password"])
        user.mark_password_changed()
        log_action(user=user, action="PASSWORD_CHANGE", request=request)
        return Response({"success": True, "message": "Password changed successfully."})


# ── Profile ───────────────────────────────────────────────────────────────────

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


# ── Admin: User List & Detail ─────────────────────────────────────────────────

class AdminUserListView(generics.ListCreateAPIView):
    serializer_class = UserAdminSerializer
    permission_classes = [IsAdmin]
    queryset = User.objects.all().order_by("-created_at")

    def perform_create(self, serializer):
        user = serializer.save()
        log_action(
            user=self.request.user, action="USER_CREATED",
            target_model="User", target_id=user.pk, request=self.request
        )


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = UserAdminSerializer
    permission_classes = [IsAdmin]
    queryset = User.objects.all()

    def perform_update(self, serializer):
        old = UserAdminSerializer(self.get_object()).data
        user = serializer.save()
        log_action(
            user=self.request.user, action="USER_UPDATED",
            target_model="User", target_id=user.pk,
            old_value=str(old), new_value=str(UserAdminSerializer(user).data),
            request=self.request
        )
