from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_pedidos, name='list_pedidos'),
    path('nuevo/', views.create_pedido, name='create_pedido'),
    path('<int:pk>/editar/', views.edit_pedido, name='edit_pedido'),
]
