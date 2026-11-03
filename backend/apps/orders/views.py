from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Sum, F

from .models import Order, OrderItem, CartItem
from .serializers import (
    OrderListSerializer, OrderDetailSerializer,
    CartItemSerializer, CartItemCreateSerializer,
    CheckoutSerializer,
)


class CartViewSet(viewsets.GenericViewSet):
    """
    GET    /api/orders/cart/          — View cart items
    POST   /api/orders/cart/          — Add / update item in cart
    DELETE /api/orders/cart/{id}/     — Remove item from cart
    POST   /api/orders/cart/checkout/ — Place order from cart
    DELETE /api/orders/cart/clear/    — Clear entire cart
    """

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CartItem.objects.filter(user=self.request.user).select_related('product', 'product__shop')

    def list(self, request):
        """GET — list all cart items with computed totals."""
        items = self.get_queryset()
        serializer = CartItemSerializer(items, many=True, context={'request': request})

        # Compute cart total
        cart_total = sum(item.line_total for item in items)

        return Response({
            'items': serializer.data,
            'item_count': items.count(),
            'cart_total': str(cart_total),
        })

    def create(self, request):
        """POST — add or update a cart item."""
        serializer = CartItemCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        cart_item = serializer.save()
        return Response(
            CartItemSerializer(cart_item, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, pk=None):
        """DELETE — remove a specific cart item."""
        try:
            item = CartItem.objects.get(pk=pk, user=request.user)
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except CartItem.DoesNotExist:
            return Response(
                {'detail': 'Cart item not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        """DELETE /api/orders/cart/clear/ — Empty the cart."""
        CartItem.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'])
    def checkout(self, request):
        """
        POST /api/orders/cart/checkout/
        Convert cart items into order(s). Groups items by shop.
        """
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart_items = CartItem.objects.filter(user=request.user).select_related('product', 'product__shop')
        if not cart_items.exists():
            return Response(
                {'detail': 'Your cart is empty.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Group cart items by shop
        shops = {}
        for item in cart_items:
            shop = item.product.shop
            if shop.id not in shops:
                shops[shop.id] = {'shop': shop, 'items': []}
            shops[shop.id]['items'].append(item)

        created_orders = []

        with transaction.atomic():
            for shop_data in shops.values():
                shop = shop_data['shop']
                items = shop_data['items']

                subtotal = sum(i.line_total for i in items)
                delivery_fee = 0  # Free delivery for now
                total = subtotal + delivery_fee

                order = Order.objects.create(
                    customer=request.user,
                    shop=shop,
                    delivery_city=serializer.validated_data['delivery_city'],
                    delivery_address=serializer.validated_data['delivery_address'],
                    delivery_phone=serializer.validated_data['delivery_phone'],
                    customer_note=serializer.validated_data.get('customer_note', ''),
                    subtotal=subtotal,
                    delivery_fee=delivery_fee,
                    total=total,
                )

                for cart_item in items:
                    OrderItem.objects.create(
                        order=order,
                        product=cart_item.product,
                        product_name=cart_item.product.name_en,
                        unit_price=cart_item.product.effective_price,
                        quantity=cart_item.quantity,
                        line_total=cart_item.line_total,
                    )

                    # Decrease stock
                    cart_item.product.stock = max(0, cart_item.product.stock - cart_item.quantity)
                    cart_item.product.save()

                created_orders.append(order)

            # Clear the cart
            cart_items.delete()

        return Response(
            {
                'message': f'{len(created_orders)} order(s) placed successfully.',
                'orders': OrderListSerializer(created_orders, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/orders/         — List user's orders
    GET /api/orders/{id}/    — Order detail
    """

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_seller:
            # Sellers see orders for their shops
            return Order.objects.filter(shop__owner=user).select_related('shop', 'customer')
        # Customers see their own orders
        return Order.objects.filter(customer=user).select_related('shop')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return OrderDetailSerializer
        return OrderListSerializer

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """
        POST /api/orders/{id}/update_status/
        Seller can update order status.
        """
        order = self.get_object()
        if order.shop.owner != request.user:
            return Response(
                {'detail': 'Only the shop owner can update order status.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_status = request.data.get('status')
        if new_status not in dict(Order.Status.choices):
            return Response(
                {'detail': f'Invalid status. Choose from: {list(dict(Order.Status.choices).keys())}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = new_status

        # Set timestamps
        from django.utils import timezone
        if new_status == Order.Status.CONFIRMED:
            order.confirmed_at = timezone.now()
        elif new_status == Order.Status.DELIVERED:
            order.delivered_at = timezone.now()
            order.is_paid = True  # Cash on delivery — paid when delivered

        order.save()
        return Response(OrderDetailSerializer(order).data)
