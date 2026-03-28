from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_menus, name='list_menus'),
    path('nuevo/', views.create_menu, name='create_menu'),
    path('<int:pk>/editar/', views.edit_menu, name='edit_menu'),
    path('<int:pk>/borrar/', views.delete_menu, name='delete_menu'),
]
