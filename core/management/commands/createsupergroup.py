from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import TeleSecGroup
from modulos.models import ModuleDefinition, TenantModule

User = get_user_model()


class Command(BaseCommand):
    help = 'Create an initial TeleSecGroup and superuser for TeleSec'

    def add_arguments(self, parser):
        parser.add_argument('--code', default='DEMO', help='Group code (slug)')
        parser.add_argument('--name', default='Grupo Demo', help='Group display name')
        parser.add_argument('--username', default='admin', help='Superuser username')
        parser.add_argument('--password', default='admin1234', help='Superuser password')
        parser.add_argument('--email', default='admin@telesec.local', help='Superuser email')
        parser.add_argument('--enable-all-modules', action='store_true',
                            help='Enable all available modules for the new group')

    def handle(self, *args, **options):
        code = options['code'].upper()
        group, g_created = TeleSecGroup.objects.get_or_create(
            code=code,
            defaults={'name': options['name']},
        )
        if g_created:
            self.stdout.write(self.style.SUCCESS(f'Created group: {group}'))
        else:
            self.stdout.write(f'Group already exists: {group}')

        username = options['username']
        if not User.objects.filter(username=username).exists():
            user = User.objects.create_superuser(
                username=username,
                email=options['email'],
                password=options['password'],
                nombre='Administrador',
                group=group,
            )
            self.stdout.write(self.style.SUCCESS(f'Created superuser: {user.username}'))
        else:
            user = User.objects.get(username=username)
            self.stdout.write(f'Superuser already exists: {user.username}')

        if options['enable_all_modules']:
            modules = ModuleDefinition.objects.all()
            for module in modules:
                _, created = TenantModule.objects.get_or_create(group=group, module=module)
                if created:
                    self.stdout.write(f'  Enabled module: {module.nombre}')

        self.stdout.write(self.style.SUCCESS('\nSetup complete!'))
        self.stdout.write(f'  Group code: {code}')
        self.stdout.write(f'  Username:   {username}')
        self.stdout.write(f'  Password:   {options["password"]}')
        self.stdout.write(f'  URL:        http://localhost:8080/login/')
