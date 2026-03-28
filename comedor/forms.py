from django import forms
from .models import MenuComedor


class MenuComedorForm(forms.ModelForm):
    class Meta:
        model = MenuComedor
        fields = ['fecha', 'tipo', 'primero', 'segundo', 'postre',
                  'primero_picto_id', 'primero_picto_text',
                  'segundo_picto_id', 'segundo_picto_text',
                  'postre_picto_id', 'postre_picto_text']
        widgets = {
            'fecha': forms.DateInput(attrs={'type': 'date'}),
        }
