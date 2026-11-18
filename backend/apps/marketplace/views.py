from rest_framework import viewsets, permissions, filters, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db import models
from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend

from .models import Category, Shop, Product
from .serializers import (
    CategorySerializer, ShopListSerializer, ShopDetailSerializer, ShopCreateSerializer,
    ProductSerializer, ProductCreateSerializer,
)
from apps.authentication.permissions import IsSeller, IsShopOwner, IsVerifiedShopSeller


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/marketplace/categories/ — List all categories
    """

    queryset = Category.objects.annotate(product_count=Count('products'))
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'


class ShopViewSet(viewsets.ModelViewSet):
    """
    GET    /api/marketplace/shops/       — List active shops (public)
    GET    /api/marketplace/shops/{id}/  — Shop detail with products (public)
    POST   /api/marketplace/shops/       — Create shop (seller only, is_verified=False)
    PATCH  /api/marketplace/shops/{id}/  — Update shop (owner only)
    DELETE /api/marketplace/shops/{id}/  — Delete shop (owner only)
    """

    queryset = Shop.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'city']
    filterset_fields = ['city', 'is_verified']

    def get_queryset(self):
        user = self.request.user
        if self.action in ('list', 'retrieve'):
            # Anyone can list/retrieve active shops.
            # Authenticated sellers can also view their own shop even if inactive.
            if user.is_authenticated and getattr(user, 'is_seller', False):
                return Shop.objects.filter(
                    Q(is_active=True) | Q(owner=user)
                ).annotate(product_count=Count('products'))
            return Shop.objects.filter(is_active=True).annotate(
                product_count=Count('products')
            )
        # For update, partial_update, destroy
        if user.is_authenticated:
            if getattr(user, 'role', '') == 'admin' or user.is_staff:
                return Shop.objects.all()
            return Shop.objects.filter(owner=user)
        return Shop.objects.filter(is_active=True)

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ShopCreateSerializer
        if self.action == 'retrieve':
            return ShopDetailSerializer
        return ShopListSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsSeller()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsSeller(), IsShopOwner()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, is_verified=False)


class ProductViewSet(viewsets.ModelViewSet):
    """
    GET    /api/marketplace/products/       — List products (public: only active & verified shops)
    GET    /api/marketplace/products/{id}/  — Product detail (public: only active & verified shops)
    POST   /api/marketplace/products/       — Create product (verified active seller only)
    PATCH  /api/marketplace/products/{id}/  — Update product (seller/owner only)
    DELETE /api/marketplace/products/{id}/  — Delete product (seller/owner only)
    """

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name_en', 'name_ne']
    filterset_fields = ['category', 'shop', 'is_available']
    ordering_fields = ['price', 'created_at']

    def get_queryset(self):
        qs = Product.objects.select_related('shop', 'category')
        user = self.request.user

        # In public product list, products of unverified or inactive shops must not appear
        if self.action in ('list', 'retrieve'):
            if user.is_authenticated and getattr(user, 'is_seller', False):
                # Seller can see products of verified/active shops OR their own products
                qs = qs.filter(
                    Q(shop__is_verified=True, shop__is_active=True) |
                    Q(shop__owner=user)
                )
            else:
                qs = qs.filter(shop__is_verified=True, shop__is_active=True)
        else:
            if user.is_authenticated and not (user.is_staff or getattr(user, 'role', '') == 'admin'):
                qs = qs.filter(shop__owner=user)

        # Filter by city if provided
        city = self.request.query_params.get('city')
        if city:
            qs = qs.filter(shop__city__iexact=city)
        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ProductCreateSerializer
        return ProductSerializer

    def get_permissions(self):
        if self.action in ('create',):
            return [permissions.IsAuthenticated(), IsSeller(), IsVerifiedShopSeller()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsSeller(), IsShopOwner()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        shop = Shop.objects.filter(owner=self.request.user, is_verified=True, is_active=True).first()
        if not shop:
            raise PermissionDenied('You must have a verified and active shop to create products.')
        serializer.save(shop=shop)
