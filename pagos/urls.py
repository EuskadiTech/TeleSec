from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_pagos, name='list_pagos'),
    path('nuevo/', views.create_pago, name='create_pago'),
    path('<int:pk>/borrar/', views.delete_pago, name='delete_pago'),
]
