from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect

urlpatterns = [
    path('', lambda request: redirect('dashboard'), name='home'),
    path('admin/', admin.site.urls),
    path('', include('core.urls')),
    path('modulos/', include('modulos.urls')),
    path('personas/', include('personas.urls')),
    path('comedor/', include('comedor.urls')),
    path('asistencia/', include('asistencia.urls')),
    path('pagos/', include('pagos.urls')),
    path('supercafe/', include('supercafe.urls')),
    path('materiales/', include('materiales.urls')),
    path('aulas/', include('aulas.urls')),
    path('notas/', include('notas.urls')),
    path('dataman/', include('dataman.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
