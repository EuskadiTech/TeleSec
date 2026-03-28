from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib import messages
import datetime
from .models import RegistroAsistencia
from .forms import RegistroAsistenciaForm


@login_required
def list_asistencia(request):
    fecha_str = request.GET.get('fecha')
    if fecha_str:
        try:
            fecha = datetime.date.fromisoformat(fecha_str)
        except ValueError:
            fecha = datetime.date.today()
    else:
        fecha = datetime.date.today()
    registros = RegistroAsistencia.objects.filter(
        group=request.user.group, fecha=fecha
    ).select_related('persona')
    return render(request, 'asistencia/list.html', {'registros': registros, 'fecha': fecha})


@login_required
@permission_required('asistencia.edit_asistencia', raise_exception=True)
def create_asistencia(request):
    form = RegistroAsistenciaForm(request.POST or None, group=request.user.group)
    if form.is_valid():
        registro = form.save(commit=False)
        registro.group = request.user.group
        registro.save()
        messages.success(request, 'Asistencia registrada.')
        return redirect('list_asistencia')
    return render(request, 'asistencia/form.html', {'form': form, 'action': 'Registrar'})


@login_required
@permission_required('asistencia.edit_asistencia', raise_exception=True)
def edit_asistencia(request, pk):
    registro = get_object_or_404(RegistroAsistencia, pk=pk, group=request.user.group)
    form = RegistroAsistenciaForm(request.POST or None, instance=registro, group=request.user.group)
    if form.is_valid():
        form.save()
        messages.success(request, 'Asistencia actualizada.')
        return redirect('list_asistencia')
    return render(request, 'asistencia/form.html', {'form': form, 'registro': registro, 'action': 'Editar'})
