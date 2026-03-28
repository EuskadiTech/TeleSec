from django.core.management.base import BaseCommand
from modulos.models import ModuleDefinition


MODULES = [
    {
        'app_label': 'personas',
        'nombre': 'Personas',
        'descripcion': 'Gestión de personas del grupo (alumnos, personal, etc.)',
        'icon': 'people-fill',
        'required_permission': 'personas.view_persona',
        'url_name': 'list_personas',
    },
    {
        'app_label': 'comedor',
        'nombre': 'Comedor',
        'descripcion': 'Menús del comedor con pictogramas ARASAAC',
        'icon': 'cup-hot-fill',
        'required_permission': 'comedor.view_menucomedor',
        'url_name': 'list_menus',
    },
    {
        'app_label': 'asistencia',
        'nombre': 'Asistencia',
        'descripcion': 'Control de asistencia diaria',
        'icon': 'calendar-check-fill',
        'required_permission': 'asistencia.view_registroasistencia',
        'url_name': 'list_asistencia',
    },
    {
        'app_label': 'pagos',
        'nombre': 'Pagos',
        'descripcion': 'Terminal de pagos y monedero virtual',
        'icon': 'credit-card-fill',
        'required_permission': 'pagos.view_pago',
        'url_name': 'list_pagos',
    },
    {
        'app_label': 'supercafe',
        'nombre': 'SuperCafé',
        'descripcion': 'Gestión de pedidos de la cafetería',
        'icon': 'cup-straw',
        'required_permission': 'supercafe.view_pedidosupercafe',
        'url_name': 'list_pedidos',
    },
    {
        'app_label': 'materiales',
        'nombre': 'Materiales',
        'descripcion': 'Inventario y control de materiales',
        'icon': 'boxes',
        'required_permission': 'materiales.view_material',
        'url_name': 'list_materiales',
    },
    {
        'app_label': 'aulas',
        'nombre': 'Aulas',
        'descripcion': 'Informes de aula y monitorización de ordenadores',
        'icon': 'pc-display',
        'required_permission': 'aulas.view_informeaula',
        'url_name': 'list_informes',
    },
    {
        'app_label': 'notas',
        'nombre': 'Notas',
        'descripcion': 'Notas y alertas con soporte Markdown',
        'icon': 'journal-text',
        'required_permission': 'notas.view_nota',
        'url_name': 'list_notas',
    },
    {
        'app_label': 'dataman',
        'nombre': 'DataMan',
        'descripcion': 'Gestor de datos personalizados (tablas arbitrarias)',
        'icon': 'table',
        'required_permission': 'dataman.view_tablapersonalizada',
        'url_name': 'list_tablas',
    },
]


class Command(BaseCommand):
    help = 'Create or update all ModuleDefinition entries in the database'

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0
        for data in MODULES:
            obj, created = ModuleDefinition.objects.update_or_create(
                app_label=data['app_label'],
                defaults={
                    'nombre': data['nombre'],
                    'descripcion': data['descripcion'],
                    'icon': data['icon'],
                    'required_permission': data['required_permission'],
                    'url_name': data['url_name'],
                    'is_builtin': True,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  Created: {obj.nombre}'))
            else:
                updated_count += 1
                self.stdout.write(f'  Updated: {obj.nombre}')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! {created_count} created, {updated_count} updated.'
        ))
