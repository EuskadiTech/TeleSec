from django.contrib import admin
from .models import Nota


@admin.register(Nota)
class NotaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'tipo', 'persona', 'group', 'created_at')
    list_filter = ('group', 'tipo')
    search_fields = ('titulo', 'contenido_md')
