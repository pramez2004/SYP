from django.contrib import admin
from .models import Festival, RitualStep, PujaItem


class RitualStepInline(admin.TabularInline):
    model = RitualStep
    extra = 1
    ordering = ['order']


class PujaItemInline(admin.TabularInline):
    model = PujaItem
    extra = 1


@admin.register(Festival)
class FestivalAdmin(admin.ModelAdmin):
    list_display = ('name_en', 'name_ne', 'date_start', 'date_end', 'is_national_holiday', 'is_featured')
    list_filter = ('is_national_holiday', 'is_featured', 'date_start')
    search_fields = ('name_en', 'name_ne')
    prepopulated_fields = {'slug': ('name_en',)}
    inlines = [RitualStepInline, PujaItemInline]
