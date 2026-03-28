import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='InformeAula',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('aula', models.CharField(max_length=100)),
                ('fecha', models.DateField()),
                ('contenido', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='informes_aula', to='core.TeleSecGroup')),
            ],
            options={
                'verbose_name': 'Informe de Aula',
                'verbose_name_plural': 'Informes de Aula',
                'ordering': ['-fecha', 'aula'],
                'permissions': [
                    ('edit_informeaula', 'Can edit informes de aula'),
                    ('view_resumen_diario', 'Can view resumen diario'),
                ],
            },
        ),
        migrations.CreateModel(
            name='OrdenadorAula',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('hostname', models.CharField(max_length=200)),
                ('aula', models.CharField(blank=True, max_length=100)),
                ('usuario_actual', models.CharField(blank=True, max_length=200)),
                ('app_actual_ejecutable', models.CharField(blank=True, max_length=500)),
                ('app_actual_titulo', models.CharField(blank=True, max_length=500)),
                ('last_seen_at', models.DateTimeField(blank=True, null=True)),
                ('comando_apagado', models.BooleanField(default=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ordenadores', to='core.TeleSecGroup')),
            ],
            options={
                'verbose_name': 'Ordenador de Aula',
                'verbose_name_plural': 'Ordenadores de Aula',
                'unique_together': {('group', 'hostname')},
            },
        ),
    ]
