from django.db import models
from django.contrib.auth.models import AbstractUser, Permission
from django.conf import settings


class TeleSecGroup(models.Model):
    code = models.SlugField(unique=True, max_length=50)
    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Grupo TeleSec'
        verbose_name_plural = 'Grupos TeleSec'

    def __str__(self):
        return f"{self.code} - {self.name}"


class User(AbstractUser):
    group = models.ForeignKey(
        TeleSecGroup, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='users'
    )
    nombre = models.CharField(max_length=200, blank=True)
    zona = models.CharField(max_length=100, blank=True)
    anilla = models.CharField(max_length=7, blank=True)  # hex color
    monedero_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    foto = models.ImageField(upload_to='personas/', null=True, blank=True)
    notas = models.TextField(blank=True)
    oculto = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def get_display_name(self):
        return self.nombre or self.get_full_name() or self.username

    def __str__(self):
        return self.get_display_name()


class Rol(models.Model):
    """A named collection of permissions for a TeleSecGroup."""
    group = models.ForeignKey(TeleSecGroup, on_delete=models.CASCADE, related_name='roles')
    nombre = models.CharField(max_length=100)
    permissions = models.ManyToManyField(Permission, blank=True)
    is_admin = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'
        unique_together = ('group', 'nombre')

    def __str__(self):
        return f"{self.group.code} - {self.nombre}"


class UserRol(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='user_roles')
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE, related_name='user_roles')

    class Meta:
        unique_together = ('user', 'rol')
        verbose_name = 'Rol de Usuario'
        verbose_name_plural = 'Roles de Usuarios'

    def __str__(self):
        return f"{self.user} → {self.rol}"
