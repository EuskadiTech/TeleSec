from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_asistencia, name='list_asistencia'),
    path('nueva/', views.create_asistencia, name='create_asistencia'),
    path('<int:pk>/editar/', views.edit_asistencia, name='edit_asistencia'),
]
