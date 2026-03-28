from django.contrib import admin
from .models import ModuleDefinition, TenantModule


@admin.register(ModuleDefinition)
class ModuleDefinitionAdmin(admin.ModelAdmin):
    list_display = ('app_label', 'nombre', 'version', 'is_builtin')
    search_fields = ('app_label', 'nombre')


@admin.register(TenantModule)
class TenantModuleAdmin(admin.ModelAdmin):
    list_display = ('group', 'module', 'enabled_at')
    list_filter = ('group', 'module')
