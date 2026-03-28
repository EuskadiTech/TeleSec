from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_personas, name='list_personas'),
    path('nueva/', views.create_persona, name='create_persona'),
    path('<int:pk>/', views.detail_persona, name='detail_persona'),
    path('<int:pk>/editar/', views.edit_persona, name='edit_persona'),
    path('<int:pk>/borrar/', views.delete_persona, name='delete_persona'),
]
