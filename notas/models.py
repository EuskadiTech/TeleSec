from django.db import models
from core.models import TeleSecGroup


class Nota(models.Model):
    TIPO_CHOICES = [('Normal', 'Normal'), ('Alerta', 'Alerta')]

    group = models.ForeignKey(TeleSecGroup, on_delete=models.CASCADE, related_name='notas')
    titulo = models.CharField(max_length=300)
    contenido_md = models.TextField(blank=True)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES, default='Normal')
    persona = models.ForeignKey(
        'personas.Persona', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='notas_asociadas'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Nota'
        verbose_name_plural = 'Notas'
        ordering = ['-created_at']
        permissions = [
            ('edit_nota', 'Can edit notas'),
        ]

    def __str__(self):
        return self.titulo
