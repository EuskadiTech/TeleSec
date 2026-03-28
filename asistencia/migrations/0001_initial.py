import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),
        ('personas', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='RegistroAsistencia',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha', models.DateField()),
                ('estado', models.CharField(
                    choices=[('Presente', 'Presente'), ('Ausente', 'Ausente'),
                             ('Tarde', 'Tarde'), ('Justificada', 'Justificada'), ('/', '/')],
                    default='/', max_length=20,
                )),
                ('notas', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='asistencias', to='core.teleSecgroup')),
                ('persona', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='asistencias', to='personas.persona')),
            ],
            options={
                'verbose_name': 'Registro de Asistencia',
                'verbose_name_plural': 'Registros de Asistencia',
                'ordering': ['-fecha', 'persona__nombre'],
                'permissions': [('edit_asistencia', 'Can edit asistencia')],
                'unique_together': {('persona', 'fecha')},
            },
        ),
    ]
