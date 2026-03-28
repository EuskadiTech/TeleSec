from django.contrib import admin
from .models import MenuComedor


@admin.register(MenuComedor)
class MenuComedorAdmin(admin.ModelAdmin):
    list_display = ('fecha', 'tipo', 'group', 'primero', 'segundo', 'postre')
    list_filter = ('group', 'tipo', 'fecha')
    date_hierarchy = 'fecha'
