from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User model for Chaad Baad.
    Supports three roles: Customer, Seller, and Admin.
    """

    class Role(models.TextChoices):
        CUSTOMER = 'customer', 'Customer'
        SELLER = 'seller', 'Seller'
        ADMIN = 'admin', 'Admin'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CUSTOMER,
    )
    phone_number = models.CharField(max_length=15, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    preferred_language = models.CharField(
        max_length=5,
        choices=[('en', 'English'), ('ne', 'Nepali')],
        default='ne',
    )
    city = models.CharField(max_length=100, blank=True)  # e.g., Damak, Birtamod, Itahari
    address = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    @property
    def is_seller(self):
        return self.role == self.Role.SELLER

    @property
    def is_customer(self):
        return self.role == self.Role.CUSTOMER
