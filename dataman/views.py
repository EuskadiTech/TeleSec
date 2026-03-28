from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib import messages
from .models import TablaPersonalizada, FilaDatos
from .forms import TablaForm, FilaDatosForm


@login_required
def list_tablas(request):
    tablas = TablaPersonalizada.objects.filter(group=request.user.group)
    return render(request, 'dataman/list.html', {'tablas': tablas})


@login_required
@permission_required('dataman.edit_filadatos', raise_exception=True)
def create_tabla(request):
    form = TablaForm(request.POST or None)
    if form.is_valid():
        tabla = form.save(commit=False)
        tabla.group = request.user.group
        tabla.save()
        messages.success(request, f'Tabla "{tabla.nombre}" creada.')
        return redirect('list_tablas')
    return render(request, 'dataman/tabla_form.html', {'form': form, 'action': 'Crear'})


@login_required
def detail_tabla(request, pk):
    tabla = get_object_or_404(TablaPersonalizada, pk=pk, group=request.user.group)
    filas = tabla.filas.all()
    return render(request, 'dataman/detail.html', {'tabla': tabla, 'filas': filas})


@login_required
@permission_required('dataman.edit_filadatos', raise_exception=True)
def create_fila(request, tabla_pk):
    tabla = get_object_or_404(TablaPersonalizada, pk=tabla_pk, group=request.user.group)
    form = FilaDatosForm(request.POST or None, tabla=tabla)
    if form.is_valid():
        fila = FilaDatos(tabla=tabla, datos=form.cleaned_data)
        fila.save()
        messages.success(request, 'Fila añadida.')
        return redirect('detail_tabla', pk=tabla.pk)
    return render(request, 'dataman/fila_form.html', {'form': form, 'tabla': tabla, 'action': 'Añadir'})


@login_required
@permission_required('dataman.edit_filadatos', raise_exception=True)
def delete_fila(request, pk):
    fila = get_object_or_404(FilaDatos, pk=pk, tabla__group=request.user.group)
    tabla_pk = fila.tabla.pk
    if request.method == 'POST':
        fila.delete()
        messages.success(request, 'Fila eliminada.')
        return redirect('detail_tabla', pk=tabla_pk)
    return render(request, 'dataman/confirm_delete.html', {'fila': fila})
