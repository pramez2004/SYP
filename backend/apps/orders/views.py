from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .models import Order, OrderItem, CartItem
from apps.marketplace.models import Product
from .serializers import (
    OrderListSerializer, OrderDetailSerializer,
    CartItemSerializer, CartItemCreateSerializer,
    CheckoutSerializer,
)
from apps.authentication.permissions import IsSeller


SELLER_ALLOWED_TRANSITIONS = {
    Order.Status.PLACED: [Order.Status.CONFIRMED, Order.Status.CANCELLED],
    Order.Status.CONFIRMED: [Order.Status.PACKED, Order.Status.CANCELLED],
    Order.Status.PACKED: [Order.Status.OUT_FOR_DELIVERY],
    Order.Status.OUT_FOR_DELIVERY: [Order.Status.DELIVERED],
    Order.Status.DELIVERED: [],
    Order.Status.CANCELLED: [],
}


def restore_order_stock(order):
    """Restore stock for all items in an order."""
    for item in order.items.select_related('product').all():
        if item.product_id:
            Product.objects.filter(id=item.product_id).update(
                stock=F('stock') + item.quantity
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
        Locks products, validates stock, availability, shop status, and delivery city.
        """
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        delivery_city = serializer.validated_data['delivery_city'].strip()

        with transaction.atomic():
            cart_items = list(
                CartItem.objects.filter(user=request.user)
                .select_related('product', 'product__shop')
            )
            if not cart_items:
                return Response(
                    {'detail': 'Your cart is empty.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Lock products with select_for_update()
            product_ids = [item.product_id for item in cart_items]
            locked_products = {
                p.id: p
                for p in Product.objects.select_for_update()
                .select_related('shop')
                .filter(id__in=product_ids)
            }

            # Validate each cart item against product and shop rules
            for item in cart_items:
                product = locked_products.get(item.product_id)
                if not product:
                    return Response(
                        {'detail': f'Product "{item.product.name_en}" is no longer available.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                shop = product.shop
                if not shop.is_active or not shop.is_verified:
                    return Response(
                        {'detail': f'Shop "{shop.name}" is currently inactive or not verified.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if delivery_city.lower() != shop.city.strip().lower():
                    return Response(
                        {
                            'detail': (
                                f'Delivery city "{delivery_city}" does not match '
                                f'shop city "{shop.city}" for product "{product.name_en}".'
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if not product.is_available:
                    return Response(
                        {'detail': f'Product "{product.name_en}" is currently unavailable.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if item.quantity > product.stock:
                    return Response(
                        {
                            'detail': (
                                f'Insufficient stock for "{product.name_en}". '
                                f'Requested: {item.quantity}, available: {product.stock}.'
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Group cart items by shop
            shops = {}
            for item in cart_items:
                product = locked_products[item.product_id]
                shop = product.shop
                if shop.id not in shops:
                    shops[shop.id] = {'shop': shop, 'items': []}
                shops[shop.id]['items'].append((item, product))

            created_orders = []
            for shop_data in shops.values():
                shop = shop_data['shop']
                items_with_products = shop_data['items']

                subtotal = sum(product.effective_price * item.quantity for item, product in items_with_products)
                delivery_fee = 0  # Free delivery
                total = subtotal + delivery_fee

                order = Order.objects.create(
                    customer=request.user,
                    shop=shop,
                    delivery_city=delivery_city,
                    delivery_address=serializer.validated_data['delivery_address'],
                    delivery_phone=serializer.validated_data['delivery_phone'],
                    customer_note=serializer.validated_data.get('customer_note', ''),
                    subtotal=subtotal,
                    delivery_fee=delivery_fee,
                    total=total,
                )

                for item, product in items_with_products:
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        product_name=product.name_en,
                        unit_price=product.effective_price,
                        quantity=item.quantity,
                        line_total=product.effective_price * item.quantity,
                    )

                    # Deduct stock safely (never clamped silently to 0)
                    product.stock -= item.quantity
                    product.save(update_fields=['stock'])

                created_orders.append(order)

            # Clear cart after successful checkout
            CartItem.objects.filter(user=request.user).delete()

        return Response(
            {
                'message': f'{len(created_orders)} order(s) placed successfully.',
                'orders': OrderListSerializer(created_orders, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /api/orders/                — List user's orders
    GET  /api/orders/{id}/           — Order detail
    POST /api/orders/{id}/update_status/ — Seller updates status (strict progression / cancel)
    POST /api/orders/{id}/cancel/        — Customer cancels order while status is 'placed'
    """

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Order.objects.none()
        if getattr(user, 'role', '') == 'admin' or user.is_staff:
            return Order.objects.all().select_related('shop', 'customer')
        if self.action in ('update_status', 'cancel'):
            # Return all orders so detail-level checks can return 403 Forbidden instead of 404
            return Order.objects.all().select_related('shop', 'customer')
        if user.is_seller:
            return Order.objects.filter(shop__owner=user).select_related('shop', 'customer')
        return Order.objects.filter(customer=user).select_related('shop')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return OrderDetailSerializer
        return OrderListSerializer

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsSeller])
    def update_status(self, request, pk=None):
        """
        POST /api/orders/{id}/update_status/
        Seller can update order status following strict forward flow or cancel from placed/confirmed.
        """
        order = self.get_object()
        if order.shop.owner != request.user:
            return Response(
                {'detail': 'Only the shop owner can update order status.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_status = request.data.get('status')
        allowed_statuses = SELLER_ALLOWED_TRANSITIONS.get(order.status, [])

        if not new_status or new_status not in allowed_statuses:
            return Response(
                {
                    'detail': f'Cannot transition order from "{order.status}" to "{new_status}".',
                    'allowed_transitions': allowed_statuses,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            order.status = new_status

            if new_status == Order.Status.CONFIRMED:
                order.confirmed_at = timezone.now()
            elif new_status == Order.Status.DELIVERED:
                order.delivered_at = timezone.now()
                order.is_paid = True
            elif new_status == Order.Status.CANCELLED:
                restore_order_stock(order)

            order.save()

        return Response(OrderDetailSerializer(order).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cancel(self, request, pk=None):
        """
        POST /api/orders/{id}/cancel/
        Customer can cancel their own order only while it is in 'placed' status.
        Cancelling restores product stock.
        """
        order = self.get_object()
        if order.customer != request.user:
            return Response(
                {'detail': 'You can only cancel your own orders.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.status != Order.Status.PLACED:
            return Response(
                {
                    'detail': f'Cannot cancel order with status "{order.status}". Only orders with status "placed" can be cancelled.',
                    'allowed_transitions': [],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            order.status = Order.Status.CANCELLED
            order.save(update_fields=['status', 'updated_at'])
            restore_order_stock(order)

        return Response(OrderDetailSerializer(order).data)
