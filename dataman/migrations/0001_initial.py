import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='TablaPersonalizada',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=200)),
                ('descripcion', models.TextField(blank=True)),
                ('schema', models.JSONField(default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tablas', to='core.teleSecgroup')),
            ],
            options={
                'verbose_name': 'Tabla Personalizada',
                'verbose_name_plural': 'Tablas Personalizadas',
                'ordering': ['nombre'],
            },
        ),
        migrations.CreateModel(
            name='FilaDatos',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('datos', models.JSONField(default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tabla', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='filas', to='dataman.tablapersonalizada')),
            ],
            options={
                'verbose_name': 'Fila de Datos',
                'verbose_name_plural': 'Filas de Datos',
                'ordering': ['-created_at'],
                'permissions': [('edit_filadatos', 'Can edit dataman rows')],
            },
        ),
    ]
