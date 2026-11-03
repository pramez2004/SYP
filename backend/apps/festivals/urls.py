from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FestivalViewSet

app_name = 'festivals'

router = DefaultRouter()
router.register('', FestivalViewSet, basename='festival')

urlpatterns = [
    path('', include(router.urls)),
]
