"""setup_instance – interactive first-run setup command.

Usage:
    python manage.py setup_instance
    python manage.py setup_instance --password secret --name "Mi Instancia"
    python manage.py setup_instance --load-catalog          # re-seed catalog only
"""
import json
import uuid

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.models import Document, InstalledModule, ModulePackage


class Command(BaseCommand):
    help = "Configura la instancia TeleSec (contraseña, persona admin, catálogo)."

    def add_arguments(self, parser):
        parser.add_argument("--password", default=None, help="Contraseña de la instancia")
        parser.add_argument("--name", default=None, help="Nombre de la instancia")
        parser.add_argument(
            "--load-catalog",
            action="store_true",
            help="Sólo (re)carga el catálogo de paquetes y sale",
        )
        parser.add_argument(
            "--admin-id", default=None, help="ID para la persona administradora"
        )
        parser.add_argument(
            "--admin-name", default="Admin", help="Nombre de la persona administradora"
        )

    def handle(self, *args, **options):
        self._load_catalog()

        if options["load_catalog"]:
            self.stdout.write(self.style.SUCCESS("Catálogo cargado correctamente."))
            return

        # Optionally show config hints
        pw = options["password"] or getattr(settings, "INSTANCE_PASSWORD", "")
        name = options["name"] or getattr(settings, "INSTANCE_NAME", "TeleSec")
        if not pw:
            self.stdout.write(
                self.style.WARNING(
                    "INSTANCE_PASSWORD no establecida. Configúrala en el entorno antes de producción."
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS(f"Contraseña: configurada ({len(pw)} caracteres)"))

        self.stdout.write(f"Nombre de instancia: {name}")

        # Create first admin persona if none exist
        if not Document.objects.filter(table_name="personas", deleted=False).exists():
            persona_id = options["admin_id"] or str(uuid.uuid4())
            nombre = options["admin_name"]
            self._create_admin(persona_id, nombre)

        # Auto-install bundled/free packages
        self._autoinstall_bundled()

        self.stdout.write(self.style.SUCCESS("✔ Instancia lista."))

    # ------------------------------------------------------------------

    def _load_catalog(self):
        catalog_path = getattr(settings, "CATALOG_PATH", None)
        if not catalog_path or not catalog_path.exists():
            self.stdout.write(self.style.WARNING(f"Catálogo no encontrado: {catalog_path}"))
            return

        with open(catalog_path, encoding="utf-8") as f:
            packages = json.load(f)

        created = updated = 0
        for pkg in packages:
            _, was_created = ModulePackage.objects.update_or_create(
                package_id=pkg["package_id"],
                defaults={
                    "name": pkg["name"],
                    "description": pkg.get("description", ""),
                    "version": pkg.get("version", "1.0.0"),
                    "modules": pkg.get("modules", []),
                    "bundled": pkg.get("bundled", False),
                    "free": pkg.get("free", False),
                    "keygen_product_id": pkg.get("keygen_product_id", ""),
                    "icon": pkg.get("icon", ""),
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(f"Catálogo: {created} paquetes creados, {updated} actualizados.")
        )

    def _create_admin(self, persona_id: str, nombre: str):
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        data = {
            "Nombre": nombre,
            "Roles": "ADMIN,",
            "Region": "",
            "Monedero_Balance": 0,
            "markdown": "Cuenta de administrador creada por setup_instance.",
        }
        Document.objects.create(
            id=f"personas:{persona_id}",
            table_name="personas",
            data=json.dumps(data, ensure_ascii=False, separators=(",", ":")),
            deleted=False,
            updated_at=now,
        )
        self.stdout.write(
            self.style.SUCCESS(f"✔ Persona administradora creada: {nombre} (id={persona_id})")
        )

    def _autoinstall_bundled(self):
        for pkg in ModulePackage.objects.filter(free=True):
            _, created = InstalledModule.objects.get_or_create(
                package=pkg,
                defaults={"enabled": True},
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f"✔ Paquete '{pkg.name}' instalado automáticamente.")
                )
