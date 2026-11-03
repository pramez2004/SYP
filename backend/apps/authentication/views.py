from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model

from .serializers import RegisterSerializer, UserProfileSerializer

User = get_user_model()


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
