from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_materiales, name='list_materiales'),
    path('nuevo/', views.create_material, name='create_material'),
    path('<int:pk>/editar/', views.edit_material, name='edit_material'),
    path('<int:pk>/movimiento/', views.movimiento_material, name='movimiento_material'),
]
