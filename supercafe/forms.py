from django import forms
from .models import PedidoSupercafe
from personas.models import Persona


class PedidoSupercafeForm(forms.ModelForm):
    class Meta:
        model = PedidoSupercafe
        fields = ['persona', 'fecha', 'estado', 'notas', 'total']
        widgets = {
            'fecha': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
            'notas': forms.Textarea(attrs={'rows': 2}),
        }

    def __init__(self, *args, group=None, **kwargs):
        super().__init__(*args, **kwargs)
        if group:
            self.fields['persona'].queryset = Persona.objects.filter(group=group, oculto=False)
