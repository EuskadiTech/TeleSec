document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('page-loader');

  // 1. Ocultar el spinner al cargar la página por primera vez
  window.addEventListener('load', () => {
    loader.classList.add('hidden');
  });

  // ==========================================
  // HANDLER PARA EL BOTÓN ATRÁS (Móviles / BFCache)
  // ==========================================
  window.addEventListener('pageshow', (event) => {
    // Si event.persisted es true, significa que el usuario vino de "Atrás" 
    // y el navegador restauró la página desde la caché.
    if (event.persisted) {
      loader.classList.add('hidden'); // Forzamos a ocultar el spinner
    }
  });

  // 2. Controlar CLICS en enlaces (con exclusiones)
  document.body.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    const target = anchor.getAttribute('target');
    const isDownload = anchor.hasAttribute('download');

    if (
      target === '_blank' || 
      isDownload || 
      !href || 
      href.startsWith('#') || 
      href.startsWith('mailto:') || 
      href.startsWith('tel:')
    ) {
      return; 
    }

    loader.classList.remove('hidden');
  });

  // 3. Controlar ENVÍO DE FORMULARIOS PHP
  document.body.addEventListener('submit', (e) => {
    const form = e.target;
    const target = form.getAttribute('target');

    if (target === '_blank') return;

    loader.classList.remove('hidden');
  });
});
