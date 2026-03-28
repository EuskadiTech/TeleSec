from django.db import models
from core.models import TeleSecGroup


class TablaPersonalizada(models.Model):
    group = models.ForeignKey(TeleSecGroup, on_delete=models.CASCADE, related_name='tablas')
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    schema = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Tabla Personalizada'
        verbose_name_plural = 'Tablas Personalizadas'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class FilaDatos(models.Model):
    tabla = models.ForeignKey(TablaPersonalizada, on_delete=models.CASCADE, related_name='filas')
    datos = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Fila de Datos'
        verbose_name_plural = 'Filas de Datos'
        ordering = ['-created_at']
        permissions = [
            ('edit_filadatos', 'Can edit dataman rows'),
        ]

    def __str__(self):
        return f"Fila #{self.pk} de {self.tabla.nombre}"
