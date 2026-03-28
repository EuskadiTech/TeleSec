from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from .models import ModuleDefinition, TenantModule


@login_required
def store(request):
    all_modules = ModuleDefinition.objects.all()
    enabled_ids = set()
    if request.user.group:
        enabled_ids = set(
            TenantModule.objects.filter(group=request.user.group)
            .values_list('module_id', flat=True)
        )
    return render(request, 'modulos/store.html', {
        'all_modules': all_modules,
        'enabled_ids': enabled_ids,
    })


@login_required
@require_POST
def toggle(request, module_id):
    if not request.user.group:
        return JsonResponse({'error': 'No group assigned'}, status=400)
    if not request.user.is_staff and not request.user.is_superuser:
        return JsonResponse({'error': 'Permission denied'}, status=403)

    module = get_object_or_404(ModuleDefinition, pk=module_id)
    group = request.user.group
    tm, created = TenantModule.objects.get_or_create(group=group, module=module)
    if not created:
        tm.delete()
        return JsonResponse({'status': 'disabled'})
    return JsonResponse({'status': 'enabled'})
