import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Persona',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=200)),
                ('zona', models.CharField(blank=True, max_length=100)),
                ('anilla', models.CharField(blank=True, max_length=7)),
                ('monedero_balance', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('foto', models.ImageField(blank=True, null=True, upload_to='personas/')),
                ('notas', models.TextField(blank=True)),
                ('oculto', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='personas', to='core.teleSecgroup')),
                ('user', models.OneToOneField(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='persona',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Persona',
                'verbose_name_plural': 'Personas',
                'ordering': ['nombre'],
                'permissions': [('edit_persona', 'Can edit personas')],
            },
        ),
    ]
