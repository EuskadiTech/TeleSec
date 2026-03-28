from django.contrib import admin
from .models import PedidoSupercafe, ItemPedido


class ItemPedidoInline(admin.TabularInline):
    model = ItemPedido
    extra = 1


@admin.register(PedidoSupercafe)
class PedidoSupercafeAdmin(admin.ModelAdmin):
    list_display = ('persona', 'fecha', 'estado', 'total', 'group')
    list_filter = ('group', 'estado')
    inlines = [ItemPedidoInline]
