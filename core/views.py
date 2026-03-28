from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.http import require_http_methods

from .models import TeleSecGroup


@require_http_methods(['GET', 'POST'])
def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')

    if request.method == 'POST':
        group_code = request.POST.get('group_code', '').strip().upper()
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')

        try:
            group = TeleSecGroup.objects.get(code=group_code)
        except TeleSecGroup.DoesNotExist:
            messages.error(request, 'Código de grupo no encontrado.')
            return render(request, 'core/login.html')

        user = authenticate(request, username=username, password=password)
        if user is not None:
            if user.group == group or user.is_superuser:
                login(request, user)
                next_url = request.GET.get('next', '/dashboard/')
                return redirect(next_url)
            else:
                messages.error(request, 'Este usuario no pertenece al grupo indicado.')
        else:
            messages.error(request, 'Usuario o contraseña incorrectos.')

    return render(request, 'core/login.html')


@login_required
def logout_view(request):
    logout(request)
    return redirect('login')


@login_required
def dashboard(request):
    from modulos.models import TenantModule
    enabled_modules = []
    if request.user.group:
        enabled_modules = TenantModule.objects.filter(
            group=request.user.group, module__isnull=False
        ).select_related('module')
    return render(request, 'core/dashboard.html', {
        'enabled_modules': enabled_modules,
    })
