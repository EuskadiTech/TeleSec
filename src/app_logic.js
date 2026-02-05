function fixfloat(number) {
  return parseFloat(number).toPrecision(8);
}

function tableScroll(query) {
  $(query).doubleScroll();
}
//var secretTokenEl = document.getElementById("secretToken");
var container = document.getElementById('container');

function open_page(params) {
  // Clear stored event listeners and timers
  EventListeners.GunJS = [];
  EventListeners.Timeout.forEach((ev) => clearTimeout(ev));
  EventListeners.Timeout = [];
  EventListeners.Interval.forEach((ev) => clearInterval(ev));
  EventListeners.Interval = [];
  EventListeners.QRScanner.forEach((ev) => ev.clear());
  EventListeners.QRScanner = [];
  EventListeners.Custom.forEach((ev) => ev());
  EventListeners.Custom = [];

  if (SUB_LOGGED_IN != true && params != 'login,setup' && !params.startsWith('login,onboarding')) {
    PAGES['login'].index();
    return;
  }
  if (params == '') {
    params = 'index';
  }
  var path = params.split(',');
  var app = path[0];
  if (path[1] == undefined) {
    PAGES[app].index();
    return;
  }
  PAGES[app].edit(path[1]);
}

function setUrlHash(hash) {
  location.hash = '#' + hash;

  // Handle quick search transfer
  if (hash === 'buscar') {
    const quickSearchInput = document.getElementById('quickSearchInput');
    if (quickSearchInput && quickSearchInput.value.trim()) {
      // Store the search term temporarily
      sessionStorage.setItem('telesec_quick_search', quickSearchInput.value.trim());
      quickSearchInput.value = ''; // Clear the input
    }
  }
}
window.onhashchange = () => {
  open_page(location.hash.replace('#', ''));
};

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute(
    'href',
    'data:application/octet-stream;charset=utf-8,' + encodeURIComponent(text)
  );
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function resizeInputImage(file, callback, targetHeight = 256, targetQuality = 0.75) {
  const reader = new FileReader();

  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      const aspectRatio = img.width / img.height;
      const targetWidth = targetHeight * aspectRatio;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Get resized image as Blob
      const dataURL = canvas.toDataURL('image/jpeg', targetQuality);
      callback(dataURL);
    };
    img.src = event.target.result;
  };

  reader.readAsDataURL(file);
}

function CurrentISODate() {
  return new Date().toISOString().split('T')[0].replace('T', ' ');
}

function CurrentISOTime() {
  return new Date().toISOString();
}

function fixGunLocalStorage() {
  localStorage.removeItem('radata');
  removeCache();
  location.reload();
}

// Heartbeat: store a small "last seen" doc locally and replicate to remote when available
// setInterval(() => {
//   if (typeof DB !== 'undefined') {
//     DB.put('heartbeat', getDBName() || 'heartbeat', 'heartbeat-' + CurrentISOTime());
//   }
// }, 5000);

function betterSorter(a, b) {
  // 1. Fecha (ascending)
  if (a.Fecha && b.Fecha && a.Fecha !== b.Fecha) {
    return a.Fecha > b.Fecha ? -1 : 1;
  }
  // 2. Region (ascending, from SC_Personas if Persona exists)
  const regionA =
    a.Persona && SC_Personas[a.Persona] ? SC_Personas[a.Persona].Region || '' : a.Region || '';
  const regionB =
    b.Persona && SC_Personas[b.Persona] ? SC_Personas[b.Persona].Region || '' : b.Region || '';
  if (regionA !== regionB) {
    return regionA.toLowerCase() < regionB.toLowerCase() ? -1 : 1;
  }
  // 3. Persona (Nombre, ascending, from SC_Personas if Persona exists)
  const nombrePersonaA =
    a.Persona && SC_Personas[a.Persona] ? SC_Personas[a.Persona].Nombre || '' : '';
  const nombrePersonaB =
    b.Persona && SC_Personas[b.Persona] ? SC_Personas[b.Persona].Nombre || '' : '';
  if (nombrePersonaA !== nombrePersonaB) {
    return nombrePersonaA.toLowerCase() < nombrePersonaB.toLowerCase() ? -1 : 1;
  }
  // 4. Nombre (ascending, from a.Nombre/b.Nombre)
  if (a.Nombre && b.Nombre && a.Nombre !== b.Nombre) {
    return a.Nombre.toLowerCase() < b.Nombre.toLowerCase() ? -1 : 1;
  }
  // 5. Asunto (ascending, from a.Asunto/b.Asunto)
  if (a.Asunto && b.Asunto && a.Asunto !== b.Asunto) {
    return a.Asunto.toLowerCase() < b.Asunto.toLowerCase() ? -1 : 1;
  }
  return 0;
}
