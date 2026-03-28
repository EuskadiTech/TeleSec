from django.db import models
from django.utils import timezone
from core.models import TeleSecGroup


class PedidoSupercafe(models.Model):
    ESTADO_CHOICES = [
        ('Pendiente', 'Pendiente'),
        ('Pagado', 'Pagado'),
        ('Deuda', 'Deuda'),
    ]

    group = models.ForeignKey(TeleSecGroup, on_delete=models.CASCADE, related_name='pedidos_supercafe')
    persona = models.ForeignKey('personas.Persona', on_delete=models.CASCADE, related_name='pedidos_supercafe')
    fecha = models.DateTimeField(default=timezone.now)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='Pendiente')
    notas = models.TextField(blank=True)
    total = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Pedido SuperCafé'
        verbose_name_plural = 'Pedidos SuperCafé'
        ordering = ['-fecha']
        permissions = [
            ('edit_pedidosupercafe', 'Can edit supercafe'),
        ]

    def __str__(self):
        return f"{self.persona.nombre} - {self.fecha:%Y-%m-%d %H:%M} ({self.estado})"


class ItemPedido(models.Model):
    pedido = models.ForeignKey(PedidoSupercafe, on_delete=models.CASCADE, related_name='items')
    nombre = models.CharField(max_length=200)
    cantidad = models.PositiveIntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    class Meta:
        verbose_name = 'Ítem de Pedido'
        verbose_name_plural = 'Ítems de Pedido'

    def __str__(self):
        return f"{self.nombre} x{self.cantidad}"

    @property
    def subtotal(self):
        return self.cantidad * self.precio_unitario
