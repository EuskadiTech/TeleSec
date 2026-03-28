from django.contrib import admin
from .models import Material, MovimientoMaterial


class MovimientoInline(admin.TabularInline):
    model = MovimientoMaterial
    extra = 0
    readonly_fields = ('antes', 'despues', 'fecha')


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'cantidad', 'unidad', 'ubicacion', 'group')
    list_filter = ('group',)
    search_fields = ('nombre', 'ubicacion')
    inlines = [MovimientoInline]


@admin.register(MovimientoMaterial)
class MovimientoMaterialAdmin(admin.ModelAdmin):
    list_display = ('material', 'tipo', 'cantidad', 'antes', 'despues', 'fecha')
    list_filter = ('tipo',)
