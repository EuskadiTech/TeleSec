from django.db import models
from core.models import TeleSecGroup


class InformeAula(models.Model):
    group = models.ForeignKey(TeleSecGroup, on_delete=models.CASCADE, related_name='informes_aula')
    aula = models.CharField(max_length=100)
    fecha = models.DateField()
    contenido = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Informe de Aula'
        verbose_name_plural = 'Informes de Aula'
        ordering = ['-fecha', 'aula']
        permissions = [
            ('edit_informeaula', 'Can edit informes de aula'),
            ('view_resumen_diario', 'Can view resumen diario'),
        ]

    def __str__(self):
        return f"{self.aula} - {self.fecha}"


class OrdenadorAula(models.Model):
    group = models.ForeignKey(TeleSecGroup, on_delete=models.CASCADE, related_name='ordenadores')
    hostname = models.CharField(max_length=200)
    aula = models.CharField(max_length=100, blank=True)
    usuario_actual = models.CharField(max_length=200, blank=True)
    app_actual_ejecutable = models.CharField(max_length=500, blank=True)
    app_actual_titulo = models.CharField(max_length=500, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    comando_apagado = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Ordenador de Aula'
        verbose_name_plural = 'Ordenadores de Aula'
        unique_together = ('group', 'hostname')

    def __str__(self):
        return f"{self.hostname} ({self.aula})"
