from django import forms
from .models import Persona


class PersonaForm(forms.ModelForm):
    class Meta:
        model = Persona
        fields = ['nombre', 'zona', 'anilla', 'monedero_balance', 'foto', 'notas', 'oculto']
        widgets = {
            'notas': forms.Textarea(attrs={'rows': 3}),
            'anilla': forms.TextInput(attrs={'type': 'color'}),
        }
