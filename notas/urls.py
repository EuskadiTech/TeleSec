from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_notas, name='list_notas'),
    path('nueva/', views.create_nota, name='create_nota'),
    path('<int:pk>/editar/', views.edit_nota, name='edit_nota'),
    path('<int:pk>/borrar/', views.delete_nota, name='delete_nota'),
]
