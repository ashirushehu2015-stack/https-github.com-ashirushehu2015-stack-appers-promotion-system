from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, LogoutView,
    PasswordChangeView, ProfileView,
    TOTPSetupView, TOTPVerifyView,
    AdminUserListView, AdminUserDetailView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("password/change/", PasswordChangeView.as_view(), name="password_change"),
    path("me/", ProfileView.as_view(), name="profile"),
    path("2fa/setup/", TOTPSetupView.as_view(), name="totp_setup"),
    path("2fa/verify/", TOTPVerifyView.as_view(), name="totp_verify"),
    # Admin-only
    path("users/", AdminUserListView.as_view(), name="admin_user_list"),
    path("users/<int:pk>/", AdminUserDetailView.as_view(), name="admin_user_detail"),
]
