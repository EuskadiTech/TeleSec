from django.db import models
from django.conf import settings
from core.models import TeleSecGroup


class Persona(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='persona'
    )
    group = models.ForeignKey(TeleSecGroup, on_delete=models.CASCADE, related_name='personas')
    nombre = models.CharField(max_length=200)
    zona = models.CharField(max_length=100, blank=True)
    anilla = models.CharField(max_length=7, blank=True)
    monedero_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    foto = models.ImageField(upload_to='personas/', null=True, blank=True)
    notas = models.TextField(blank=True)
    oculto = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Persona'
        verbose_name_plural = 'Personas'
        ordering = ['nombre']
        permissions = [
            ('edit_persona', 'Can edit personas'),
        ]

    def __str__(self):
        return self.nombre
