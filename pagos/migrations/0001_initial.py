import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),
        ('personas', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Pago',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(
                    choices=[('Ingreso', 'Ingreso'), ('Gasto', 'Gasto'), ('Transferencia', 'Transferencia')],
                    max_length=20,
                )),
                ('monto', models.DecimalField(decimal_places=2, max_digits=10)),
                ('metodo', models.CharField(
                    choices=[('Efectivo', 'Efectivo'), ('Tarjeta', 'Tarjeta'), ('Otro', 'Otro')],
                    default='Efectivo', max_length=20,
                )),
                ('notas', models.TextField(blank=True)),
                ('fecha', models.DateTimeField(default=django.utils.timezone.now)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pagos', to='core.TeleSecGroup')),
                ('persona', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pagos', to='personas.persona')),
                ('persona_destino', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='pagos_recibidos',
                    to='personas.persona',
                )),
                ('usuario_registro', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='pagos_registrados',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Pago',
                'verbose_name_plural': 'Pagos',
                'ordering': ['-fecha'],
                'permissions': [('edit_pago', 'Can edit pagos')],
            },
        ),
    ]
