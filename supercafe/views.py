from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib import messages
from .models import PedidoSupercafe
from .forms import PedidoSupercafeForm


@login_required
def list_pedidos(request):
    pedidos = PedidoSupercafe.objects.filter(group=request.user.group).select_related('persona')
    return render(request, 'supercafe/list.html', {'pedidos': pedidos})


@login_required
@permission_required('supercafe.edit_pedidosupercafe', raise_exception=True)
def create_pedido(request):
    form = PedidoSupercafeForm(request.POST or None, group=request.user.group)
    if form.is_valid():
        pedido = form.save(commit=False)
        pedido.group = request.user.group
        pedido.save()
        messages.success(request, 'Pedido creado.')
        return redirect('list_pedidos')
    return render(request, 'supercafe/form.html', {'form': form, 'action': 'Crear'})


@login_required
@permission_required('supercafe.edit_pedidosupercafe', raise_exception=True)
def edit_pedido(request, pk):
    pedido = get_object_or_404(PedidoSupercafe, pk=pk, group=request.user.group)
    form = PedidoSupercafeForm(request.POST or None, instance=pedido, group=request.user.group)
    if form.is_valid():
        form.save()
        messages.success(request, 'Pedido actualizado.')
        return redirect('list_pedidos')
    return render(request, 'supercafe/form.html', {'form': form, 'pedido': pedido, 'action': 'Editar'})
