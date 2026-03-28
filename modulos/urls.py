from django.urls import path
from . import views

urlpatterns = [
    path('', views.store, name='modulos_store'),
    path('<int:module_id>/toggle/', views.toggle, name='modulos_toggle'),
]
