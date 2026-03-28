"""Template tags for adding Bootstrap classes to form fields."""
from django import template

register = template.Library()


@register.filter(name='add_class')
def add_class(field, css_class):
    return field.as_widget(attrs={'class': css_class})


@register.filter(name='bs_field')
def bs_field(field):
    """Render a form field with appropriate Bootstrap 5 classes."""
    widget = field.field.widget
    widget_class = widget.__class__.__name__

    extra = dict(widget.attrs)
    if widget_class == 'CheckboxInput':
        extra['class'] = 'form-check-input'
    elif widget_class in ('Select', 'SelectMultiple'):
        extra['class'] = f"form-select {extra.get('class', '')}".strip()
    else:
        extra['class'] = f"form-control {extra.get('class', '')}".strip()
    return field.as_widget(attrs=extra)
