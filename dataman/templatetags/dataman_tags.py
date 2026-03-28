from django import template

register = template.Library()


@register.filter(name='get_item')
def get_item(dictionary, key):
    """Access a dictionary value by variable key in templates."""
    if isinstance(dictionary, dict):
        return dictionary.get(key, '')
    return ''
