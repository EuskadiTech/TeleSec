from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib import messages
from .models import Persona
from .forms import PersonaForm


@login_required
def list_personas(request):
    personas = Persona.objects.filter(group=request.user.group, oculto=False)
    return render(request, 'personas/list.html', {'personas': personas})


@login_required
@permission_required('personas.edit_persona', raise_exception=True)
def create_persona(request):
    form = PersonaForm(request.POST or None, request.FILES or None)
    if form.is_valid():
        persona = form.save(commit=False)
        persona.group = request.user.group
        persona.save()
        messages.success(request, f'Persona "{persona.nombre}" creada correctamente.')
        return redirect('list_personas')
    return render(request, 'personas/form.html', {'form': form, 'action': 'Crear'})


@login_required
def detail_persona(request, pk):
    persona = get_object_or_404(Persona, pk=pk, group=request.user.group)
    return render(request, 'personas/detail.html', {'persona': persona})


@login_required
@permission_required('personas.edit_persona', raise_exception=True)
def edit_persona(request, pk):
    persona = get_object_or_404(Persona, pk=pk, group=request.user.group)
    form = PersonaForm(request.POST or None, request.FILES or None, instance=persona)
    if form.is_valid():
        form.save()
        messages.success(request, f'Persona "{persona.nombre}" actualizada.')
        return redirect('detail_persona', pk=persona.pk)
    return render(request, 'personas/form.html', {'form': form, 'persona': persona, 'action': 'Editar'})


@login_required
@permission_required('personas.edit_persona', raise_exception=True)
def delete_persona(request, pk):
    persona = get_object_or_404(Persona, pk=pk, group=request.user.group)
    if request.method == 'POST':
        nombre = persona.nombre
        persona.delete()
        messages.success(request, f'Persona "{nombre}" eliminada.')
        return redirect('list_personas')
    return render(request, 'personas/confirm_delete.html', {'persona': persona})
