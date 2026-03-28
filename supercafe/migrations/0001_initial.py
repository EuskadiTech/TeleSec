import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),
        ('personas', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PedidoSupercafe',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha', models.DateTimeField(default=django.utils.timezone.now)),
                ('estado', models.CharField(
                    choices=[('Pendiente', 'Pendiente'), ('Pagado', 'Pagado'), ('Deuda', 'Deuda')],
                    default='Pendiente', max_length=20,
                )),
                ('notas', models.TextField(blank=True)),
                ('total', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pedidos_supercafe', to='core.TeleSecGroup')),
                ('persona', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pedidos_supercafe', to='personas.persona')),
            ],
            options={
                'verbose_name': 'Pedido SuperCafé',
                'verbose_name_plural': 'Pedidos SuperCafé',
                'ordering': ['-fecha'],
                'permissions': [('edit_pedidosupercafe', 'Can edit supercafe')],
            },
        ),
        migrations.CreateModel(
            name='ItemPedido',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=200)),
                ('cantidad', models.PositiveIntegerField(default=1)),
                ('precio_unitario', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('pedido', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='supercafe.pedidosupercafe')),
            ],
            options={
                'verbose_name': 'Ítem de Pedido',
                'verbose_name_plural': 'Ítems de Pedido',
            },
        ),
    ]
