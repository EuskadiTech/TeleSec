from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib import messages
from .models import Material, MovimientoMaterial
from .forms import MaterialForm, MovimientoForm


@login_required
def list_materiales(request):
    materiales = Material.objects.filter(group=request.user.group)
    return render(request, 'materiales/list.html', {'materiales': materiales})


@login_required
@permission_required('materiales.edit_material', raise_exception=True)
def create_material(request):
    form = MaterialForm(request.POST or None)
    if form.is_valid():
        material = form.save(commit=False)
        material.group = request.user.group
        material.save()
        messages.success(request, f'Material "{material.nombre}" creado.')
        return redirect('list_materiales')
    return render(request, 'materiales/form.html', {'form': form, 'action': 'Crear'})


@login_required
@permission_required('materiales.edit_material', raise_exception=True)
def edit_material(request, pk):
    material = get_object_or_404(Material, pk=pk, group=request.user.group)
    form = MaterialForm(request.POST or None, instance=material)
    if form.is_valid():
        form.save()
        messages.success(request, 'Material actualizado.')
        return redirect('list_materiales')
    return render(request, 'materiales/form.html', {'form': form, 'material': material, 'action': 'Editar'})


@login_required
@permission_required('materiales.edit_material', raise_exception=True)
def movimiento_material(request, pk):
    material = get_object_or_404(Material, pk=pk, group=request.user.group)
    form = MovimientoForm(request.POST or None)
    if form.is_valid():
        tipo = form.cleaned_data['tipo']
        cantidad = form.cleaned_data['cantidad']
        antes = material.cantidad
        if tipo == 'Salida':
            if cantidad > material.cantidad:
                form.add_error('cantidad', 'No hay suficiente stock para esta salida.')
                return render(request, 'materiales/movimiento.html', {'form': form, 'material': material})
            material.cantidad -= cantidad
        else:
            material.cantidad += cantidad
        despues = material.cantidad
        material.save()
        MovimientoMaterial.objects.create(
            material=material,
            tipo=tipo,
            cantidad=cantidad,
            antes=antes,
            despues=despues,
            nota=form.cleaned_data.get('nota', ''),
        )
        messages.success(request, 'Movimiento registrado.')
        return redirect('list_materiales')
    return render(request, 'materiales/movimiento.html', {'form': form, 'material': material})
