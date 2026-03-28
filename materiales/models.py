from django.db import models
from django.utils import timezone
from core.models import TeleSecGroup


class Material(models.Model):
    group = models.ForeignKey(TeleSecGroup, on_delete=models.CASCADE, related_name='materiales')
    nombre = models.CharField(max_length=200)
    cantidad = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    cantidad_minima = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    unidad = models.CharField(max_length=50, blank=True)
    ubicacion = models.CharField(max_length=200, blank=True)
    revision = models.CharField(max_length=100, blank=True)
    notas = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Material'
        verbose_name_plural = 'Materiales'
        ordering = ['nombre']
        permissions = [
            ('edit_material', 'Can edit materiales'),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.cantidad} {self.unidad})"

    @property
    def bajo_minimo(self):
        return self.cantidad <= self.cantidad_minima


class MovimientoMaterial(models.Model):
    TIPO_CHOICES = [('Entrada', 'Entrada'), ('Salida', 'Salida')]

    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='movimientos')
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    cantidad = models.DecimalField(max_digits=10, decimal_places=3)
    antes = models.DecimalField(max_digits=10, decimal_places=3)
    despues = models.DecimalField(max_digits=10, decimal_places=3)
    nota = models.TextField(blank=True)
    fecha = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'Movimiento de Material'
        verbose_name_plural = 'Movimientos de Material'
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.material.nombre} {self.tipo} {self.cantidad}"
