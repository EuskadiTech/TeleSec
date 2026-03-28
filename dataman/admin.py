from django.contrib import admin
from .models import TablaPersonalizada, FilaDatos


class FilaDatosInline(admin.TabularInline):
    model = FilaDatos
    extra = 0


@admin.register(TablaPersonalizada)
class TablaPersonalizadaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'group', 'created_at')
    list_filter = ('group',)
    search_fields = ('nombre',)
    inlines = [FilaDatosInline]


@admin.register(FilaDatos)
class FilaDatosAdmin(admin.ModelAdmin):
    list_display = ('tabla', 'created_at')
    list_filter = ('tabla__group',)
