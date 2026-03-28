from django.contrib import admin
from .models import RegistroAsistencia


@admin.register(RegistroAsistencia)
class RegistroAsistenciaAdmin(admin.ModelAdmin):
    list_display = ('persona', 'fecha', 'estado', 'group')
    list_filter = ('group', 'estado', 'fecha')
    date_hierarchy = 'fecha'
