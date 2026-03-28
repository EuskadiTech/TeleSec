from django.contrib import admin
from .models import Pago


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ('persona', 'tipo', 'monto', 'metodo', 'fecha', 'group')
    list_filter = ('group', 'tipo', 'metodo')
    date_hierarchy = 'fecha'
