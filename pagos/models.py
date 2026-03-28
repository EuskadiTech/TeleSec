from django.db import models
from django.conf import settings
from django.utils import timezone
from core.models import TeleSecGroup


class Pago(models.Model):
    TIPO_CHOICES = [
        ('Ingreso', 'Ingreso'),
        ('Gasto', 'Gasto'),
        ('Transferencia', 'Transferencia'),
    ]
    METODO_CHOICES = [
        ('Efectivo', 'Efectivo'),
        ('Tarjeta', 'Tarjeta'),
        ('Otro', 'Otro'),
    ]

    group = models.ForeignKey(TeleSecGroup, on_delete=models.CASCADE, related_name='pagos')
    persona = models.ForeignKey('personas.Persona', on_delete=models.CASCADE, related_name='pagos')
    persona_destino = models.ForeignKey(
        'personas.Persona', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='pagos_recibidos'
    )
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    metodo = models.CharField(max_length=20, choices=METODO_CHOICES, default='Efectivo')
    notas = models.TextField(blank=True)
    usuario_registro = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL,
        related_name='pagos_registrados'
    )
    fecha = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'
        ordering = ['-fecha']
        permissions = [
            ('edit_pago', 'Can edit pagos'),
        ]

    def __str__(self):
        return f"{self.persona.nombre} - {self.tipo}: {self.monto}"
