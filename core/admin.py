from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import TeleSecGroup, User, Rol, UserRol


@admin.register(TeleSecGroup)
class TeleSecGroupAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'created_at')
    search_fields = ('code', 'name')


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('TeleSec', {'fields': ('group', 'nombre', 'zona', 'anilla', 'monedero_balance', 'foto', 'notas', 'oculto')}),
    )
    list_display = ('username', 'nombre', 'group', 'email', 'is_staff')
    list_filter = ('group', 'is_staff', 'is_superuser', 'oculto')
    search_fields = ('username', 'nombre', 'email')


@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'group', 'is_admin')
    list_filter = ('group', 'is_admin')
    filter_horizontal = ('permissions',)


@admin.register(UserRol)
class UserRolAdmin(admin.ModelAdmin):
    list_display = ('user', 'rol')
    list_filter = ('rol__group',)
