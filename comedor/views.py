from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib import messages
import datetime
from .models import MenuComedor
from .forms import MenuComedorForm


@login_required
def list_menus(request):
    menus = MenuComedor.objects.filter(group=request.user.group).order_by('-fecha')
    return render(request, 'comedor/list.html', {'menus': menus})


@login_required
@permission_required('comedor.edit_menucomedor', raise_exception=True)
def create_menu(request):
    form = MenuComedorForm(request.POST or None)
    if form.is_valid():
        menu = form.save(commit=False)
        menu.group = request.user.group
        menu.save()
        messages.success(request, 'Menú creado correctamente.')
        return redirect('list_menus')
    return render(request, 'comedor/form.html', {'form': form, 'action': 'Crear'})


@login_required
@permission_required('comedor.edit_menucomedor', raise_exception=True)
def edit_menu(request, pk):
    menu = get_object_or_404(MenuComedor, pk=pk, group=request.user.group)
    form = MenuComedorForm(request.POST or None, instance=menu)
    if form.is_valid():
        form.save()
        messages.success(request, 'Menú actualizado.')
        return redirect('list_menus')
    return render(request, 'comedor/form.html', {'form': form, 'menu': menu, 'action': 'Editar'})


@login_required
@permission_required('comedor.edit_menucomedor', raise_exception=True)
def delete_menu(request, pk):
    menu = get_object_or_404(MenuComedor, pk=pk, group=request.user.group)
    if request.method == 'POST':
        menu.delete()
        messages.success(request, 'Menú eliminado.')
        return redirect('list_menus')
    return render(request, 'comedor/confirm_delete.html', {'menu': menu})
