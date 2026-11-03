from django.contrib import admin
from .models import Category, Shop, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name_en', 'name_ne', 'order')
    prepopulated_fields = {'slug': ('name_en',)}


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'city', 'is_verified', 'is_active', 'rating')
    list_filter = ('city', 'is_verified', 'is_active')
    search_fields = ('name', 'owner__username', 'city')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name_en', 'shop', 'category', 'price', 'discount_price', 'stock', 'is_available')
    list_filter = ('category', 'shop__city', 'is_available')
    search_fields = ('name_en', 'name_ne', 'shop__name')
