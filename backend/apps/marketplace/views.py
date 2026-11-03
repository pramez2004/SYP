from rest_framework import viewsets, permissions, filters, status
from rest_framework.response import Response
from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend

from .models import Category, Shop, Product
from .serializers import (
    CategorySerializer, ShopListSerializer, ShopDetailSerializer,
    ProductSerializer, ProductCreateSerializer,
)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/marketplace/categories/ — List all categories
    """

    queryset = Category.objects.annotate(product_count=Count('products'))
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'


class ShopViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/marketplace/shops/       — List shops
    GET /api/marketplace/shops/{id}/  — Shop detail with products
    """

    queryset = Shop.objects.filter(is_active=True).annotate(
        product_count=Count('products')
    )
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'city']
    filterset_fields = ['city', 'is_verified']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ShopDetailSerializer
        return ShopListSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """
    GET    /api/marketplace/products/       — List products (public)
    GET    /api/marketplace/products/{id}/  — Product detail (public)
    POST   /api/marketplace/products/       — Create product (seller only)
    PATCH  /api/marketplace/products/{id}/  — Update product (seller/owner only)
    DELETE /api/marketplace/products/{id}/  — Delete product (seller/owner only)
    """

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name_en', 'name_ne']
    filterset_fields = ['category', 'shop', 'is_available']
    ordering_fields = ['price', 'created_at']

    def get_queryset(self):
        qs = Product.objects.select_related('shop', 'category')
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
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        shop = self.request.user.shops.first()
        serializer.save(shop=shop)

    def perform_update(self, serializer):
        # Ensure only the shop owner can update
        if serializer.instance.shop.owner != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only edit your own products.')
        serializer.save()

    def perform_destroy(self, instance):
        if instance.shop.owner != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only delete your own products.')
        instance.delete()
