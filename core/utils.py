from core.models import UserRol


def checkRole(user, permission_codename):
    """Check if a user has a given permission via their assigned Roles or direct permissions."""
    if user.is_superuser:
        return True
    if user.has_perm(permission_codename):
        return True
    # Check via UserRol → Rol → permissions
    _, codename = permission_codename.split('.') if '.' in permission_codename else ('', permission_codename)
    for user_rol in UserRol.objects.filter(user=user).select_related('rol'):
        rol = user_rol.rol
        if rol.is_admin:
            return True
        if rol.permissions.filter(codename=codename).exists():
            return True
    return False
