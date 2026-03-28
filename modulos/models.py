from django.db import models
from core.models import TeleSecGroup


class ModuleDefinition(models.Model):
    app_label = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='box')
    version = models.CharField(max_length=20, default='1.0.0')
    is_builtin = models.BooleanField(default=True)
    required_permission = models.CharField(max_length=100, blank=True)
    url_name = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name = 'Definición de Módulo'
        verbose_name_plural = 'Definiciones de Módulos'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class TenantModule(models.Model):
    group = models.ForeignKey(TeleSecGroup, on_delete=models.CASCADE, related_name='tenant_modules')
    module = models.ForeignKey(ModuleDefinition, on_delete=models.CASCADE, related_name='tenant_modules')
    enabled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('group', 'module')
        verbose_name = 'Módulo del Grupo'
        verbose_name_plural = 'Módulos del Grupo'

    def __str__(self):
        return f"{self.group.code} - {self.module.nombre}"
