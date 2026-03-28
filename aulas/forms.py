from django import forms
from .models import InformeAula


class InformeAulaForm(forms.ModelForm):
    class Meta:
        model = InformeAula
        fields = ['aula', 'fecha', 'contenido']
        widgets = {
            'fecha': forms.DateInput(attrs={'type': 'date'}),
            'contenido': forms.Textarea(attrs={'rows': 6}),
        }
