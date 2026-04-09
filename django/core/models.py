"""Models – no multi-tenancy; the deployed instance is the single context."""

from django.db import models


class Document(models.Model):
    """Stores every TeleSec record as a flat JSON blob.

    Primary key uses the '<table>:<item_id>' convention shared with the frontend.
    updated_at is an ISO-8601 string stored as text so cursor-based pagination
    works with simple string comparisons.
    """

    id = models.CharField(max_length=500, primary_key=True)
    table_name = models.CharField(max_length=100, db_index=True)
    data = models.TextField(default="{}")
    updated_at = models.CharField(max_length=50, db_index=True)
    deleted = models.BooleanField(default=False)

    class Meta:
        db_table = "documents"
        indexes = [
            models.Index(fields=["updated_at", "id"]),
        ]

    def __str__(self):
        return self.id


# ---------------------------------------------------------------------------
# Module system
# ---------------------------------------------------------------------------


class ModulePackage(models.Model):
    """Catalog entry for an installable module package."""

    package_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    version = models.CharField(max_length=50)
    modules = models.JSONField(default=list)
    bundled = models.BooleanField(default=False)
    free = models.BooleanField(default=False)
    keygen_product_id = models.CharField(max_length=200, blank=True)
    icon = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = "module_packages"

    def __str__(self):
        return f"{self.name} ({self.version})"


class InstalledModule(models.Model):
    """Tracks which module packages are active on this instance."""

    package = models.OneToOneField(
        ModulePackage, on_delete=models.CASCADE, related_name="install"
    )
    license_key = models.CharField(max_length=500, blank=True)
    license_id = models.CharField(max_length=200, blank=True)
    activated_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    enabled = models.BooleanField(default=True)

    class Meta:
        db_table = "installed_modules"

    def __str__(self):
        return f"{self.package_id} ({'on' if self.enabled else 'off'})"

    @property
    def enabled_modules(self):
        return self.package.modules if self.enabled else []

