from django.contrib import admin
from .models import Order, OrderItem, CartItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product_name', 'unit_price', 'quantity', 'line_total')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'shop', 'status', 'total', 'is_paid', 'placed_at')
    list_filter = ('status', 'is_paid', 'delivery_city')
    search_fields = ('customer__username', 'shop__name')
    readonly_fields = ('placed_at', 'confirmed_at', 'delivered_at')
    inlines = [OrderItemInline]


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('user', 'product', 'quantity', 'added_at')
