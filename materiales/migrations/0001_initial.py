import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Material',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=200)),
                ('cantidad', models.DecimalField(decimal_places=3, default=0, max_digits=10)),
                ('cantidad_minima', models.DecimalField(decimal_places=3, default=0, max_digits=10)),
                ('unidad', models.CharField(blank=True, max_length=50)),
                ('ubicacion', models.CharField(blank=True, max_length=200)),
                ('revision', models.CharField(blank=True, max_length=100)),
                ('notas', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='materiales', to='core.teleSecgroup')),
            ],
            options={
                'verbose_name': 'Material',
                'verbose_name_plural': 'Materiales',
                'ordering': ['nombre'],
                'permissions': [('edit_material', 'Can edit materiales')],
            },
        ),
        migrations.CreateModel(
            name='MovimientoMaterial',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(choices=[('Entrada', 'Entrada'), ('Salida', 'Salida')], max_length=10)),
                ('cantidad', models.DecimalField(decimal_places=3, max_digits=10)),
                ('antes', models.DecimalField(decimal_places=3, max_digits=10)),
                ('despues', models.DecimalField(decimal_places=3, max_digits=10)),
                ('nota', models.TextField(blank=True)),
                ('fecha', models.DateTimeField(default=django.utils.timezone.now)),
                ('material', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='movimientos', to='materiales.material')),
            ],
            options={
                'verbose_name': 'Movimiento de Material',
                'verbose_name_plural': 'Movimientos de Material',
                'ordering': ['-fecha'],
            },
        ),
    ]
