def group_modules(request):
    """Inject enabled modules for the current user's group into every template context."""
    enabled_modules = []
    if request.user.is_authenticated and request.user.group:
        try:
            from modulos.models import TenantModule
            enabled_modules = list(
                TenantModule.objects.filter(
                    group=request.user.group
                ).select_related('module').order_by('module__nombre')
            )
        except Exception:
            pass
    return {'enabled_modules': enabled_modules}
