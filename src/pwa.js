let newWorker;
const APP_VERSION = '%%VERSIONCO%%';
const VERSION_CHECK_INTERVAL_MS = 10 * 60 * 1000;
let lastVersionCheckTs = 0;
let updatePromptShown = false;

function sendCouchUrlPrefixToServiceWorker(registration) {
  if (!registration) {
    return;
  }

  const couchUrlPrefix = (localStorage.getItem('TELESEC_COUCH_URL') || '').trim();
  const message = {
    type: 'SET_COUCH_URL_PREFIX',
    url: couchUrlPrefix
  };

  if (registration.active) {
    registration.active.postMessage(message);
  }
  if (registration.waiting) {
    registration.waiting.postMessage(message);
  }
  if (registration.installing) {
    registration.installing.postMessage(message);
  }
}

async function checkAppVersion(force = false) {
  const now = Date.now();
  if (!force && now - lastVersionCheckTs < VERSION_CHECK_INTERVAL_MS) {
    return;
  }
  if (!navigator.onLine) {
    return;
  }

  lastVersionCheckTs = now;

  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-cache'
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    if (!data || !data.version) {
      return;
    }

    if (data.version !== APP_VERSION) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
      if (!updatePromptShown) {
        showUpdateBar();
        updatePromptShown = true;
      }
    } else {
      updatePromptShown = false;
    }
  } catch (error) {
    console.warn('No se pudo comprobar la versión remota:', error);
  }
}

async function ActualizarProgramaTeleSec() {
  if (!confirm('Se borrará la caché local del programa y se recargará la aplicación. ¿Continuar?')) {
    return;
  }

  let cacheCleared = true;

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        const sendSkipWaiting = (worker) => {
          worker.postMessage({ type: 'SKIP_WAITING' });
        };

        if (registration.waiting) {
          sendSkipWaiting(registration.waiting);
        } else if (registration.installing) {
          await new Promise((resolve) => {
            const installingWorker = registration.installing;
            const onStateChange = () => {
              if (installingWorker.state === 'installed') {
                installingWorker.removeEventListener('statechange', onStateChange);
                sendSkipWaiting(installingWorker);
                resolve();
              }
            };

            installingWorker.addEventListener('statechange', onStateChange);
            onStateChange();
            setTimeout(resolve, 2500);
          });
        }
      }
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }
  } catch (error) {
    cacheCleared = false;
    console.error('No se pudo limpiar la caché completamente:', error);
    if (typeof toastr !== 'undefined') {
      toastr.error('No se pudo limpiar toda la caché. Recargando igualmente...');
    }
  }

  if (cacheCleared && typeof toastr !== 'undefined') {
    toastr.success('Caché limpiada. Recargando aplicación...');
  }

  setTimeout(() => {
    location.reload();
  }, 700);
}
function showUpdateBar() {
  let snackbar = document.getElementById('snackbar');
  snackbar.className = 'show';
}

// The click event on the pop up notification
document.getElementById('reload').addEventListener('click', function () {
  setTimeout(() => {
    ActualizarProgramaTeleSec();
  }, 1000);
  if (newWorker) {
    newWorker.postMessage({ type: 'SKIP_WAITING' });
  }
});

if ('serviceWorker' in navigator) {
  const wireRegistration = (reg) => {
    reg.addEventListener('updatefound', () => {
      newWorker = reg.installing;

      newWorker.addEventListener('statechange', () => {
        switch (newWorker.state) {
          case 'installed':
            if (navigator.serviceWorker.controller) {
              showUpdateBar();
            }
            break;
        }
      });
    });
  };

  navigator.serviceWorker.getRegistration().then(async (reg) => {
    if (!reg) {
      reg = await navigator.serviceWorker.register('sw.js');
    } else {
      await reg.update();
    }

    wireRegistration(reg);
    sendCouchUrlPrefixToServiceWorker(reg);
    checkAppVersion(true);
    setInterval(checkAppVersion, VERSION_CHECK_INTERVAL_MS);
  });

  let refreshing;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (refreshing) return;
    window.location.reload();
    refreshing = true;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkAppVersion();
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== 'TELESEC_COUCH_URL') {
      return;
    }

    navigator.serviceWorker.getRegistration().then((registration) => {
      sendCouchUrlPrefixToServiceWorker(registration);
    });
  });
}
