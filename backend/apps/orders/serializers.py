from rest_framework import serializers
from .models import Order, OrderItem, CartItem
from apps.marketplace.serializers import ProductSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'unit_price', 'quantity', 'line_total']
        read_only_fields = ['product_name', 'unit_price', 'line_total']


class OrderListSerializer(serializers.ModelSerializer):
    item_count = serializers.IntegerField(source='items.count', read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'shop_name', 'total', 'item_count',
            'payment_method', 'is_paid', 'placed_at',
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'customer_name',
            'shop', 'shop_name',
            'delivery_city', 'delivery_address', 'delivery_phone',
            'subtotal', 'delivery_fee', 'total',
            'payment_method', 'is_paid',
            'customer_note', 'items',
            'placed_at', 'confirmed_at', 'delivered_at',
        ]


class CartItemSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source='product', read_only=True)
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'quantity', 'line_total', 'product_detail', 'added_at']


class CartItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = ['product', 'quantity']

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError('Quantity must be at least 1.')
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        product = validated_data['product']
        quantity = validated_data['quantity']

        # Update quantity if already in cart
        cart_item, created = CartItem.objects.update_or_create(
            user=user,
            product=product,
            defaults={'quantity': quantity},
        )
        return cart_item


class CheckoutSerializer(serializers.Serializer):
    """Serializer for placing an order from the current cart."""

    delivery_city = serializers.CharField(max_length=100)
    delivery_address = serializers.CharField()
    delivery_phone = serializers.CharField(max_length=15)
    customer_note = serializers.CharField(required=False, allow_blank=True, default='')
