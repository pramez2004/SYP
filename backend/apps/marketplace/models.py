from django.db import models
from django.conf import settings


class Category(models.Model):
    """Product category, e.g. 'Incense', 'Flowers', 'Tika Materials'."""

    name_en = models.CharField(max_length=100)
    name_ne = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=50, blank=True)  # emoji or icon name
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['order', 'name_en']

    def __str__(self):
        return self.name_en


class Shop(models.Model):
    """
    A local puja-items shop / seller store.
    Each shop is owned by a seller (User with role='seller').
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='shops',
        limit_choices_to={'role': 'seller'},
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    phone = models.CharField(max_length=15, blank=True)
    city = models.CharField(max_length=100)  # Damak, Birtamod, Itahari
    address = models.TextField(blank=True)
    logo = models.ImageField(upload_to='shops/logos/', blank=True, null=True)
    banner = models.ImageField(upload_to='shops/banners/', blank=True, null=True)

    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_verified', '-rating']

    def __str__(self):
        return f"{self.name} ({self.city})"


class Product(models.Model):
    """A puja item / product listed by a shop."""

    shop = models.ForeignKey(
        Shop, on_delete=models.CASCADE, related_name='products'
    )
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products'
    )

    name_en = models.CharField(max_length=200)
    name_ne = models.CharField(max_length=200, blank=True)
    description_en = models.TextField(blank=True)
    description_ne = models.TextField(blank=True)

    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_price = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    unit = models.CharField(max_length=50, blank=True)  # e.g., "per piece", "per bundle"

    image = models.ImageField(upload_to='products/', blank=True, null=True)
    stock = models.PositiveIntegerField(default=0)
    is_available = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name_en} — Rs. {self.price}"

    @property
    def effective_price(self):
        """Return discount price if set, else regular price."""
        return self.discount_price if self.discount_price else self.price

    @property
    def in_stock(self):
        return self.stock > 0 and self.is_available
