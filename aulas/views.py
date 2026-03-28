from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib import messages
from .models import InformeAula, OrdenadorAula
from .forms import InformeAulaForm


@login_required
def list_informes(request):
    informes = InformeAula.objects.filter(group=request.user.group)
    return render(request, 'aulas/list.html', {'informes': informes})


@login_required
@permission_required('aulas.edit_informeaula', raise_exception=True)
def create_informe(request):
    form = InformeAulaForm(request.POST or None)
    if form.is_valid():
        informe = form.save(commit=False)
        informe.group = request.user.group
        informe.save()
        messages.success(request, 'Informe creado.')
        return redirect('list_informes')
    return render(request, 'aulas/form.html', {'form': form, 'action': 'Crear'})


@login_required
@permission_required('aulas.edit_informeaula', raise_exception=True)
def edit_informe(request, pk):
    informe = get_object_or_404(InformeAula, pk=pk, group=request.user.group)
    form = InformeAulaForm(request.POST or None, instance=informe)
    if form.is_valid():
        form.save()
        messages.success(request, 'Informe actualizado.')
        return redirect('list_informes')
    return render(request, 'aulas/form.html', {'form': form, 'informe': informe, 'action': 'Editar'})


@login_required
def ordenadores(request):
    ords = OrdenadorAula.objects.filter(group=request.user.group)
    return render(request, 'aulas/ordenadores.html', {'ordenadores': ords})
