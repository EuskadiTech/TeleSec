from django import forms
from .models import Material, MovimientoMaterial


class MaterialForm(forms.ModelForm):
    class Meta:
        model = Material
        fields = ['nombre', 'cantidad', 'cantidad_minima', 'unidad', 'ubicacion', 'revision', 'notas']
        widgets = {'notas': forms.Textarea(attrs={'rows': 2})}


class MovimientoForm(forms.Form):
    tipo = forms.ChoiceField(choices=MovimientoMaterial.TIPO_CHOICES)
    cantidad = forms.DecimalField(max_digits=10, decimal_places=3, min_value=0)
    nota = forms.CharField(widget=forms.Textarea(attrs={'rows': 2}), required=False)
