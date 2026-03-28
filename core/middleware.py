from django.shortcuts import redirect
from django.conf import settings

EXEMPT_URLS = [
    settings.LOGIN_URL.lstrip('/'),
    'logout/',
    'admin/',
    'static/',
    'media/',
]


class RBACMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path.lstrip('/')

        # Skip exempted paths
        for exempt in EXEMPT_URLS:
            if path.startswith(exempt):
                return self.get_response(request)

        # Require authentication for non-exempt paths (except login)
        if not request.user.is_authenticated and path not in ('', 'login/'):
            return redirect(f"{settings.LOGIN_URL}?next={request.path}")

        return self.get_response(request)
