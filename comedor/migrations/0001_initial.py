import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='MenuComedor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha', models.DateField()),
                ('tipo', models.CharField(choices=[('Comida', 'Comida'), ('Desayuno', 'Desayuno')], default='Comida', max_length=20)),
                ('primero', models.CharField(blank=True, max_length=200)),
                ('segundo', models.CharField(blank=True, max_length=200)),
                ('postre', models.CharField(blank=True, max_length=200)),
                ('primero_picto_id', models.CharField(blank=True, max_length=20)),
                ('primero_picto_text', models.CharField(blank=True, max_length=200)),
                ('segundo_picto_id', models.CharField(blank=True, max_length=20)),
                ('segundo_picto_text', models.CharField(blank=True, max_length=200)),
                ('postre_picto_id', models.CharField(blank=True, max_length=20)),
                ('postre_picto_text', models.CharField(blank=True, max_length=200)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='menus', to='core.TeleSecGroup')),
            ],
            options={
                'verbose_name': 'Menú del Comedor',
                'verbose_name_plural': 'Menús del Comedor',
                'ordering': ['-fecha', 'tipo'],
                'permissions': [('edit_menucomedor', 'Can edit menus')],
                'unique_together': {('group', 'fecha', 'tipo')},
            },
        ),
    ]
