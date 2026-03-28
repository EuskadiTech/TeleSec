from django import forms
from .models import Pago
from personas.models import Persona


class PagoForm(forms.ModelForm):
    class Meta:
        model = Pago
        fields = ['persona', 'persona_destino', 'tipo', 'monto', 'metodo', 'notas', 'fecha']
        widgets = {
            'fecha': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
            'notas': forms.Textarea(attrs={'rows': 2}),
        }

    def __init__(self, *args, group=None, **kwargs):
        super().__init__(*args, **kwargs)
        if group:
            qs = Persona.objects.filter(group=group, oculto=False)
            self.fields['persona'].queryset = qs
            self.fields['persona_destino'].queryset = qs
            self.fields['persona_destino'].required = False
