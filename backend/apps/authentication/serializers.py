from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label='Confirm Password')

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password2',
            'first_name', 'last_name', 'phone_number',
            'role', 'city', 'preferred_language',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for viewing and updating user profile."""

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone_number', 'avatar', 'role', 'city', 'address',
            'preferred_language', 'created_at',
        ]
        read_only_fields = ['id', 'username', 'role', 'created_at']


class UserPublicSerializer(serializers.ModelSerializer):
    """Minimal user info for public display (e.g. shop owner)."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'full_name', 'avatar', 'city']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username
