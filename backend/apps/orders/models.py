from django.db import models
from django.conf import settings


class Order(models.Model):
    """
    A customer order for puja items.
    Cash on Delivery only (for now).
    """

    class Status(models.TextChoices):
        PLACED = 'placed', 'Placed'
        CONFIRMED = 'confirmed', 'Confirmed'
        PACKED = 'packed', 'Packed'
        OUT_FOR_DELIVERY = 'out_for_delivery', 'Out for Delivery'
        DELIVERED = 'delivered', 'Delivered'
        CANCELLED = 'cancelled', 'Cancelled'

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders',
    )
    shop = models.ForeignKey(
        'marketplace.Shop',
        on_delete=models.CASCADE,
        related_name='orders',
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PLACED,
    )

    # Delivery info (snapshot at order time)
    delivery_city = models.CharField(max_length=100)
    delivery_address = models.TextField()
    delivery_phone = models.CharField(max_length=15)

    # Price summary
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    # Payment
    payment_method = models.CharField(max_length=30, default='cash_on_delivery')
    is_paid = models.BooleanField(default=False)

    # Notes
    customer_note = models.TextField(blank=True)

    # Timestamps
    placed_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-placed_at']

    def __str__(self):
        return f"Order #{self.pk} — {self.customer.get_full_name()} ({self.status})"


class OrderItem(models.Model):
    """Individual line item in an order."""

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='items'
    )
    product = models.ForeignKey(
        'marketplace.Product',
        on_delete=models.SET_NULL,
        null=True,
        related_name='order_items',
    )

    # Snapshot of product at order time
    product_name = models.CharField(max_length=200)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.quantity}x {self.product_name}"


class CartItem(models.Model):
    """
    Shopping cart item. Cart exists per user, not persisted as a separate model.
    Each CartItem links a user to a product with a quantity.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cart_items',
    )
    product = models.ForeignKey(
        'marketplace.Product',
        on_delete=models.CASCADE,
        related_name='cart_items',
    )
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'product']
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.user.username}: {self.quantity}x {self.product.name_en}"

    @property
    def line_total(self):
        return self.product.effective_price * self.quantity
