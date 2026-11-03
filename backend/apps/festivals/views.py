from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend

from .models import Festival
from .serializers import FestivalListSerializer, FestivalDetailSerializer


class FestivalViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/festivals/        — List all festivals
    GET /api/festivals/{slug}/ — Festival detail with rituals & checklist
    GET /api/festivals/upcoming/ — Upcoming festivals
    GET /api/festivals/today/   — Today's festival(s)
    """

    queryset = Festival.objects.all()
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name_en', 'name_ne']
    ordering_fields = ['date_start']
    filterset_fields = ['is_national_holiday', 'is_featured']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return FestivalDetailSerializer
        return FestivalListSerializer

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Return festivals with date_start >= today, limited to 10."""
        today = timezone.now().date()
        festivals = Festival.objects.filter(date_start__gte=today)[:10]
        serializer = FestivalListSerializer(festivals, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Return festival(s) happening today."""
        today = timezone.now().date()
        festivals = Festival.objects.filter(
            Q(date_start=today) | Q(date_start__lte=today, date_end__gte=today)
        )
        serializer = FestivalListSerializer(festivals, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """Return all festivals for calendar display (year param optional)."""
        year = request.query_params.get('year', timezone.now().year)
        festivals = Festival.objects.filter(date_start__year=year)
        serializer = FestivalListSerializer(festivals, many=True, context={'request': request})
        return Response(serializer.data)
