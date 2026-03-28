from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib import messages
from .models import Pago
from .forms import PagoForm


@login_required
def list_pagos(request):
    pagos = Pago.objects.filter(group=request.user.group).select_related('persona')
    return render(request, 'pagos/list.html', {'pagos': pagos})


@login_required
@permission_required('pagos.edit_pago', raise_exception=True)
def create_pago(request):
    form = PagoForm(request.POST or None, group=request.user.group)
    if form.is_valid():
        pago = form.save(commit=False)
        pago.group = request.user.group
        pago.usuario_registro = request.user
        pago.save()
        messages.success(request, 'Pago registrado.')
        return redirect('list_pagos')
    return render(request, 'pagos/form.html', {'form': form, 'action': 'Registrar'})


@login_required
@permission_required('pagos.edit_pago', raise_exception=True)
def delete_pago(request, pk):
    pago = get_object_or_404(Pago, pk=pk, group=request.user.group)
    if request.method == 'POST':
        pago.delete()
        messages.success(request, 'Pago eliminado.')
        return redirect('list_pagos')
    return render(request, 'pagos/confirm_delete.html', {'pago': pago})
