from django.db import models
from core.models import TeleSecGroup


class MenuComedor(models.Model):
    TIPO_CHOICES = [('Comida', 'Comida'), ('Desayuno', 'Desayuno')]

    group = models.ForeignKey(TeleSecGroup, on_delete=models.CASCADE, related_name='menus')
    fecha = models.DateField()
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='Comida')
    primero = models.CharField(max_length=200, blank=True)
    segundo = models.CharField(max_length=200, blank=True)
    postre = models.CharField(max_length=200, blank=True)
    primero_picto_id = models.CharField(max_length=20, blank=True)
    primero_picto_text = models.CharField(max_length=200, blank=True)
    segundo_picto_id = models.CharField(max_length=20, blank=True)
    segundo_picto_text = models.CharField(max_length=200, blank=True)
    postre_picto_id = models.CharField(max_length=20, blank=True)
    postre_picto_text = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Menú del Comedor'
        verbose_name_plural = 'Menús del Comedor'
        ordering = ['-fecha', 'tipo']
        unique_together = ('group', 'fecha', 'tipo')
        permissions = [
            ('edit_menucomedor', 'Can edit menus'),
        ]

    def __str__(self):
        return f"{self.group.code} - {self.fecha} ({self.tipo})"
