from django import forms
from .models import TablaPersonalizada, FilaDatos


class TablaForm(forms.ModelForm):
    class Meta:
        model = TablaPersonalizada
        fields = ['nombre', 'descripcion', 'schema']
        widgets = {
            'descripcion': forms.Textarea(attrs={'rows': 2}),
            'schema': forms.Textarea(attrs={'rows': 6, 'class': 'font-monospace',
                                           'placeholder': '{"fields": [{"name": "campo1", "type": "text"}]}'}),
        }


class FilaDatosForm(forms.Form):
    """Dynamic form based on the tabla's schema."""

    def __init__(self, *args, tabla=None, **kwargs):
        super().__init__(*args, **kwargs)
        if tabla and tabla.schema:
            for field_def in tabla.schema.get('fields', []):
                name = field_def.get('name', '')
                ftype = field_def.get('type', 'text')
                if name:
                    if ftype == 'number':
                        self.fields[name] = forms.DecimalField(required=False)
                    elif ftype == 'date':
                        self.fields[name] = forms.DateField(
                            required=False,
                            widget=forms.DateInput(attrs={'type': 'date'})
                        )
                    elif ftype == 'boolean':
                        self.fields[name] = forms.BooleanField(required=False)
                    else:
                        self.fields[name] = forms.CharField(required=False)
