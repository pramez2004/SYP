from rest_framework import serializers
from .models import Festival, RitualStep, PujaItem


class RitualStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = RitualStep
        fields = [
            'id', 'order', 'title_en', 'title_ne',
            'description_en', 'description_ne', 'image',
        ]


class PujaItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name_en', read_only=True, default=None)
    product_price = serializers.DecimalField(
        source='product.effective_price', max_digits=10, decimal_places=2,
        read_only=True, default=None,
    )
    product_id = serializers.IntegerField(source='product.id', read_only=True, default=None)

    class Meta:
        model = PujaItem
        fields = [
            'id', 'name_en', 'name_ne', 'quantity',
            'is_essential', 'product_id', 'product_name', 'product_price',
        ]


class FestivalListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for festival lists."""

    days_until = serializers.SerializerMethodField()

    class Meta:
        model = Festival
        fields = [
            'id', 'slug', 'name_en', 'name_ne', 'date_start', 'date_end',
            'nepali_date', 'image', 'is_national_holiday', 'is_featured',
            'days_until',
        ]

    def get_days_until(self, obj):
        from django.utils import timezone
        today = timezone.now().date()
        delta = obj.date_start - today
        return delta.days


class FestivalDetailSerializer(serializers.ModelSerializer):
    """Full festival detail with rituals and puja checklist."""

    ritual_steps = RitualStepSerializer(many=True, read_only=True)
    puja_items = PujaItemSerializer(many=True, read_only=True)

    class Meta:
        model = Festival
        fields = [
            'id', 'slug', 'name_en', 'name_ne',
            'description_en', 'description_ne',
            'significance_en', 'significance_ne',
            'date_start', 'date_end', 'nepali_date',
            'image', 'banner',
            'is_national_holiday', 'is_featured',
            'ritual_steps', 'puja_items',
            'created_at', 'updated_at',
        ]
