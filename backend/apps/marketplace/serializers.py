from rest_framework import serializers
from .models import Category, Shop, Product
from apps.authentication.serializers import UserPublicSerializer


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = ['id', 'slug', 'name_en', 'name_ne', 'icon', 'image', 'product_count']


class ShopListSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    product_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Shop
        fields = [
            'id', 'name', 'city', 'logo', 'is_verified',
            'rating', 'total_reviews', 'owner_name', 'product_count',
        ]


class ShopDetailSerializer(serializers.ModelSerializer):
    owner = UserPublicSerializer(read_only=True)
    products = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        fields = [
            'id', 'name', 'description', 'phone', 'city', 'address',
            'logo', 'banner', 'is_verified', 'is_active',
            'rating', 'total_reviews', 'owner', 'products',
            'created_at',
        ]

    def get_products(self, obj):
        products = obj.products.filter(is_available=True)[:20]
        return ProductSerializer(products, many=True, context=self.context).data


class ShopCreateSerializer(serializers.ModelSerializer):
    """For sellers to create and update their shop."""

    is_active = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = Shop
        fields = [
            'id', 'name', 'description', 'phone', 'city', 'address',
            'logo', 'banner', 'is_active', 'is_verified', 'created_at',
        ]
        read_only_fields = ['id', 'is_verified', 'created_at']


class ProductSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    shop_city = serializers.CharField(source='shop.city', read_only=True)
    category_name = serializers.CharField(source='category.name_en', read_only=True, default=None)
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name_en', 'name_ne', 'description_en', 'description_ne',
            'price', 'discount_price', 'effective_price', 'unit',
            'image', 'stock', 'is_available', 'in_stock',
            'shop', 'shop_name', 'shop_city',
            'category', 'category_name',
            'created_at',
        ]


class ProductCreateSerializer(serializers.ModelSerializer):
    """For sellers to create/update their products."""

    class Meta:
        model = Product
        fields = [
            'id', 'name_en', 'name_ne', 'description_en', 'description_ne',
            'price', 'discount_price', 'unit', 'image', 'stock',
            'is_available', 'category',
        ]
