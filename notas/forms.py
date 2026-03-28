from django import forms
from .models import Nota
from personas.models import Persona


class NotaForm(forms.ModelForm):
    class Meta:
        model = Nota
        fields = ['titulo', 'contenido_md', 'tipo', 'persona']
        widgets = {
            'contenido_md': forms.Textarea(attrs={'rows': 8, 'class': 'font-monospace'}),
        }

    def __init__(self, *args, group=None, **kwargs):
        super().__init__(*args, **kwargs)
        if group:
            self.fields['persona'].queryset = Persona.objects.filter(group=group, oculto=False)
        self.fields['persona'].required = False
