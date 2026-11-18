from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings

from .serializers import (
    RegisterSerializer, UserProfileSerializer, ChangePasswordSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    AdminUserSerializer,
)
from .permissions import IsAdminUser, IsCustomer, IsSeller, ROLE_PERMISSIONS

User = get_user_model()


class LoginView(TokenObtainPairView):
    """
    POST /api/token/
    Obtain JWT access and refresh token pair with rate limiting.
    """

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Register a new customer or seller account.
    """

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                'message': 'Account created successfully.',
                'user': UserProfileSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/auth/profile/ — View own profile.
    PATCH /api/auth/profile/ — Update own profile.
    """

    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklists the refresh token so it can no longer be used.
    The client should also discard the access token locally.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {'detail': 'Token is invalid or already blacklisted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {'message': 'Successfully logged out.'},
            status=status.HTTP_200_OK,
        )


def blacklist_user_tokens(user):
    """Blacklist all outstanding refresh tokens for the given user."""
    tokens = OutstandingToken.objects.filter(user=user)
    for token in tokens:
        BlacklistedToken.objects.get_or_create(token=token)


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Allows an authenticated user to change their password.
    Requires old_password, new_password, and new_password2.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        blacklist_user_tokens(request.user)
        return Response(
            {'message': 'Password changed successfully.'},
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(APIView):
    """
    POST /api/auth/password-reset/
    Request a password reset email.
    Always returns 200 OK to prevent user enumeration attacks.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            subject = 'Chaad Baad - Password Reset'
            message = (
                f"Namaste {user.get_full_name() or user.username},\n\n"
                f"A request has been made to reset the password for your Chaad Baad account.\n\n"
                f"Reset UID: {uid}\n"
                f"Reset Token: {token}\n\n"
                f"Use this UID and Token in the app to set your new password.\n"
                f"If you did not request this, you can safely ignore this email.\n"
            )
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )

        return Response(
            {'message': 'If an account with that email exists, a password reset link has been sent.'},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """
    POST /api/auth/password-reset/confirm/
    Reset password using uid, token, new_password, and new_password2.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid_b64 = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            user = User.objects.get(pk=uid, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is None or not default_token_generator.check_token(user, token):
            return Response(
                {'detail': 'Invalid or expired reset token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()
        blacklist_user_tokens(user)

        return Response(
            {'message': 'Password has been reset successfully.'},
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Role-based access control
# ---------------------------------------------------------------------------

class MyPermissionsView(APIView):
    """GET /api/auth/permissions/ - the logged-in user's role and permissions."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({
            'role': request.user.role,
            'permissions': ROLE_PERMISSIONS.get(request.user.role, []),
        })


class UserListView(generics.ListAPIView):
    """GET /api/auth/users/ - list all users (admin only)."""

    queryset = User.objects.all().order_by('id')
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]


class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/auth/users/{id}/ - view a user (admin only)
    PATCH /api/auth/users/{id}/ - change role or activate/deactivate (admin only)
    """

    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ['get', 'patch', 'head', 'options']


class _AreaView(APIView):
    """Demo endpoint used to prove role checks work (returns 403 for other roles)."""

    area = ''

    def get(self, request):
        return Response({'message': f'Welcome to the {self.area} area.', 'role': request.user.role})


class CustomerAreaView(_AreaView):
    permission_classes = [IsCustomer]
    area = 'customer'


class SellerAreaView(_AreaView):
    permission_classes = [IsSeller]
    area = 'seller'


class AdminAreaView(_AreaView):
    permission_classes = [IsAdminUser]
    area = 'admin'
