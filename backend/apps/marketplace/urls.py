from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, ShopViewSet, ProductViewSet

app_name = 'marketplace'

router = DefaultRouter()
router.register('categories', CategoryViewSet, basename='category')
router.register('shops', ShopViewSet, basename='shop')
router.register('products', ProductViewSet, basename='product')

urlpatterns = [
    path('', include(router.urls)),
]
