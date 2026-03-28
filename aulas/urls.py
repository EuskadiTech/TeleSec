from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_informes, name='list_informes'),
    path('nuevo/', views.create_informe, name='create_informe'),
    path('<int:pk>/editar/', views.edit_informe, name='edit_informe'),
    path('ordenadores/', views.ordenadores, name='ordenadores'),
]
