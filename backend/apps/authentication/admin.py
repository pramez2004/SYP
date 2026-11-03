from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin for the User model."""

    list_display = ('username', 'email', 'role', 'phone_number', 'city', 'is_active')
    list_filter = ('role', 'is_active', 'city', 'preferred_language')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'phone_number')

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Chaad Baad Info', {
            'fields': ('role', 'phone_number', 'avatar', 'preferred_language', 'city', 'address'),
        }),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Chaad Baad Info', {
            'fields': ('role', 'phone_number', 'city'),
        }),
    )
