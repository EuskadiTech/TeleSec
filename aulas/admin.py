from django.contrib import admin
from .models import InformeAula, OrdenadorAula


@admin.register(InformeAula)
class InformeAulaAdmin(admin.ModelAdmin):
    list_display = ('aula', 'fecha', 'group')
    list_filter = ('group', 'aula')
    date_hierarchy = 'fecha'


@admin.register(OrdenadorAula)
class OrdenadorAulaAdmin(admin.ModelAdmin):
    list_display = ('hostname', 'aula', 'usuario_actual', 'last_seen_at', 'group')
    list_filter = ('group', 'aula')
