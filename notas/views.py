from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib import messages
from .models import Nota
from .forms import NotaForm


@login_required
def list_notas(request):
    notas = Nota.objects.filter(group=request.user.group)
    return render(request, 'notas/list.html', {'notas': notas})


@login_required
@permission_required('notas.edit_nota', raise_exception=True)
def create_nota(request):
    form = NotaForm(request.POST or None, group=request.user.group)
    if form.is_valid():
        nota = form.save(commit=False)
        nota.group = request.user.group
        nota.save()
        messages.success(request, f'Nota "{nota.titulo}" creada.')
        return redirect('list_notas')
    return render(request, 'notas/form.html', {'form': form, 'action': 'Crear'})


@login_required
@permission_required('notas.edit_nota', raise_exception=True)
def edit_nota(request, pk):
    nota = get_object_or_404(Nota, pk=pk, group=request.user.group)
    form = NotaForm(request.POST or None, instance=nota, group=request.user.group)
    if form.is_valid():
        form.save()
        messages.success(request, 'Nota actualizada.')
        return redirect('list_notas')
    return render(request, 'notas/form.html', {'form': form, 'nota': nota, 'action': 'Editar'})


@login_required
@permission_required('notas.edit_nota', raise_exception=True)
def delete_nota(request, pk):
    nota = get_object_or_404(Nota, pk=pk, group=request.user.group)
    if request.method == 'POST':
        titulo = nota.titulo
        nota.delete()
        messages.success(request, f'Nota "{titulo}" eliminada.')
        return redirect('list_notas')
    return render(request, 'notas/confirm_delete.html', {'nota': nota})
