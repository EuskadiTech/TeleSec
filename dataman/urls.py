from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_tablas, name='list_tablas'),
    path('nueva/', views.create_tabla, name='create_tabla'),
    path('<int:pk>/', views.detail_tabla, name='detail_tabla'),
    path('<int:tabla_pk>/fila/', views.create_fila, name='create_fila'),
    path('fila/<int:pk>/borrar/', views.delete_fila, name='delete_fila'),
]
