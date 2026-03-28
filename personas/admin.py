from django.contrib import admin
from .models import Persona


@admin.register(Persona)
class PersonaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'group', 'zona', 'monedero_balance', 'oculto')
    list_filter = ('group', 'oculto', 'zona')
    search_fields = ('nombre',)
