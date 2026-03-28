import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ModuleDefinition',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('app_label', models.CharField(max_length=50, unique=True)),
                ('nombre', models.CharField(max_length=100)),
                ('descripcion', models.TextField(blank=True)),
                ('icon', models.CharField(default='box', max_length=50)),
                ('version', models.CharField(default='1.0.0', max_length=20)),
                ('is_builtin', models.BooleanField(default=True)),
                ('required_permission', models.CharField(blank=True, max_length=100)),
                ('url_name', models.CharField(blank=True, max_length=100)),
            ],
            options={
                'verbose_name': 'Definición de Módulo',
                'verbose_name_plural': 'Definiciones de Módulos',
                'ordering': ['nombre'],
            },
        ),
        migrations.CreateModel(
            name='TenantModule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('enabled_at', models.DateTimeField(auto_now_add=True)),
                ('group', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='tenant_modules',
                    to='core.TeleSecGroup',
                )),
                ('module', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='tenant_modules',
                    to='modulos.moduledefinition',
                )),
            ],
            options={
                'verbose_name': 'Módulo del Grupo',
                'verbose_name_plural': 'Módulos del Grupo',
                'unique_together': {('group', 'module')},
            },
        ),
    ]
