from django.db import models
from core.models import TeleSecGroup


class RegistroAsistencia(models.Model):
    ESTADO_CHOICES = [
        ('Presente', 'Presente'),
        ('Ausente', 'Ausente'),
        ('Tarde', 'Tarde'),
        ('Justificada', 'Justificada'),
        ('/', '/'),
    ]

    group = models.ForeignKey(TeleSecGroup, on_delete=models.CASCADE, related_name='asistencias')
    persona = models.ForeignKey('personas.Persona', on_delete=models.CASCADE, related_name='asistencias')
    fecha = models.DateField()
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='/')
    notas = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Registro de Asistencia'
        verbose_name_plural = 'Registros de Asistencia'
        ordering = ['-fecha', 'persona__nombre']
        unique_together = ('persona', 'fecha')
        permissions = [
            ('edit_asistencia', 'Can edit asistencia'),
        ]

    def __str__(self):
        return f"{self.persona.nombre} - {self.fecha}: {self.estado}"
