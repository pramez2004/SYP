from django.urls import path
from .views import (
    RegisterView, ProfileView, LogoutView, ChangePasswordView,
    PasswordResetRequestView, PasswordResetConfirmView,
    MyPermissionsView, UserListView, UserDetailView,
    CustomerAreaView, SellerAreaView, AdminAreaView,
)

app_name = 'authentication'

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    # Role-based access control
    path('permissions/', MyPermissionsView.as_view(), name='my-permissions'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    # Demo endpoints that prove role checks (403 for the wrong role)
    path('demo/customer-area/', CustomerAreaView.as_view(), name='demo-customer'),
    path('demo/seller-area/', SellerAreaView.as_view(), name='demo-seller'),
    path('demo/admin-area/', AdminAreaView.as_view(), name='demo-admin'),
]
