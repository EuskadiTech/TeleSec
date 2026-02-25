try {
  navigator.wakeLock.request('screen');
} catch {
  console.log('ScreenLock Failed');
}

// Configuración de precios del café (cargado desde DB)
window.PRECIOS_CAFE = {
  servicio_base: 10,
  leche_pequena: 15,
  leche_grande: 25,
  cafe: 25,
  colacao: 25,
};

// Cargar precios desde la base de datos al iniciar
if (typeof DB !== 'undefined') {
  DB.get('config', 'precios_cafe').then((raw) => {
    TS_decrypt(raw, SECRET, (precios) => {
      if (precios) {
        Object.assign(window.PRECIOS_CAFE, precios);
        console.log('Precios del café cargados:', window.PRECIOS_CAFE);
      }
    });
  }).catch(() => {
    console.log('Usando precios por defecto');
  });
}

const debounce = (id, callback, wait, args) => {
  // debounce with trailing callback
  // First call runs immediately, then locks for 'wait' ms
  // If called during lock, saves the latest args and runs once after lock
  // If not called during lock, does nothing
  if (!debounce.timers) {
    debounce.timers = {};
    debounce.args = {};
  }
  if (!debounce.timers[id]) {
    // No lock, run immediately
    // Do not schedule a trailing call unless further calls arrive
    callback(...(Array.isArray(args) ? args : [args]));
    debounce.args[id] = null;
    debounce.timers[id] = setTimeout(() => {
      if (debounce.args[id]) {
        callback(...debounce.args[id]);
        debounce.args[id] = null;
      }
      debounce.timers[id] = null;
    }, wait);
  } else {
    // Lock active, save latest args for a single trailing invocation
    debounce.args[id] = Array.isArray(args) ? args : [args];
  }
  return id;
};

function TS_CreateSearchOverlay(parentEl, options = {}) {
  const overlayId = safeuuid();
  const panelId = safeuuid();
  const inputId = safeuuid();
  const closeId = safeuuid();
  const clearId = safeuuid();

  const overlay = document.createElement('div');
  overlay.id = overlayId;
  overlay.style.display = 'none';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0, 0, 0, 0.5)';
  overlay.style.zIndex = '9999';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.padding = '16px';
  overlay.innerHTML = html`
    <div
      id="${panelId}"
      style="background: white; padding: 12px; border-radius: 8px; width: min(520px, 100%); box-shadow: 0 10px 30px rgba(0,0,0,0.2);"
    >
      <div style="display: flex; gap: 6px; align-items: center;">
        <input
          type="text"
          id="${inputId}"
          placeholder="${options.placeholder || 'Buscar...'}"
          style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
        />
        <button type="button" class="btn4" id="${clearId}">Limpiar</button>
        <button type="button" class="btn4" id="${closeId}">Cerrar</button>
      </div>
    </div>
  `;

  const targetParent = parentEl || document.body;
  targetParent.appendChild(overlay);

  const inputEl = overlay.querySelector('#' + inputId);
  const closeEl = overlay.querySelector('#' + closeId);
  const clearEl = overlay.querySelector('#' + clearId);
  const panelEl = overlay.querySelector('#' + panelId);

  function open() {
    overlay.style.display = 'flex';
    inputEl.focus();
    inputEl.select();
  }

  function close() {
    overlay.style.display = 'none';
  }

  function setValue(value) {
    inputEl.value = value || '';
  }

  function getValue() {
    return inputEl.value || '';
  }

  inputEl.addEventListener('input', () => {
    if (typeof options.onInput === 'function') {
      options.onInput(getValue());
    }
  });

  closeEl.addEventListener('click', close);
  clearEl.addEventListener('click', () => {
    setValue('');
    if (typeof options.onInput === 'function') {
      options.onInput('');
    }
    inputEl.focus();
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay && panelEl) {
      close();
    }
  });

  return {
    open,
    close,
    setValue,
    getValue,
    inputEl,
    overlayEl: overlay,
  };
}

function TS_InitOverlaySearch(container, openBtnId, badgeId, options = {}) {
  const debounceId = options.debounceId || safeuuid();
  const wait = options.wait || 200;
  let currentValue = '';
  const badgeEl = badgeId ? document.getElementById(badgeId) : null;
  const overlay = TS_CreateSearchOverlay(container, {
    placeholder: options.placeholder || 'Buscar...',
    onInput: (value) => {
      currentValue = (value || '').toLowerCase().trim();
      if (badgeEl) {
        badgeEl.textContent = currentValue ? `Filtro: "${currentValue}"` : '';
      }
      if (typeof options.onSearch === 'function') {
        debounce(debounceId, options.onSearch, wait, [currentValue]);
      }
    },
  });
  if (openBtnId) {
    const openBtn = document.getElementById(openBtnId);
    if (openBtn) {
      openBtn.addEventListener('click', () => overlay.open());
    }
  }
  return {
    open: overlay.open,
    close: overlay.close,
    setValue: overlay.setValue,
    getValue: () => currentValue,
    getValueRaw: overlay.getValue,
  };
}

function TS_normalizePictoValue(value) {
  if (!value) {
    return { text: '', arasaacId: '' };
  }
  if (typeof value === 'string') {
    return { text: value, arasaacId: '' };
  }
  if (typeof value === 'object') {
    return {
      text: value.text || value.nombre || value.name || '',
      arasaacId: value.arasaacId || value.id || '',
    };
  }
  return { text: String(value), arasaacId: '' };
}

function TS_buildArasaacPictogramUrl(id) {
  return `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;
}

function TS_renderPictoPreview(previewEl, value) {
  const target = typeof previewEl === 'string' ? document.getElementById(previewEl) : previewEl;
  if (!target) return;
  target.innerHTML = '';
  if (!value.text && !value.arasaacId) {
    const placeholder = document.createElement('b');
    placeholder.textContent = 'Seleccionar Pictograma';
    target.appendChild(placeholder);
  }

  if (value.arasaacId) {
    const img = document.createElement('img');
    img.src = TS_buildArasaacPictogramUrl(value.arasaacId);
    img.alt = value.text || 'Pictograma';
    img.width = 100;
    img.height = 100;
    img.loading = 'lazy';
    img.style.objectFit = 'contain';
    target.appendChild(img);
  }
  if (value.text) {
    const text = document.createElement('span');
    text.textContent = value.text;
    target.appendChild(text);
  }
}
function makePictoStatic(picto) {
  var element = document.createElement('div');
  element.className = 'picto';
  TS_renderPictoPreview(element, picto);
  return element.outerHTML;
}

function TS_applyPictoValue(pictoEl, value) {
  if (typeof pictoEl === 'string') {
    pictoEl = document.getElementById(pictoEl);
  }
  const plate = TS_normalizePictoValue(value);
  pictoEl.dataset.PictoValue = JSON.stringify(plate);
  TS_renderPictoPreview(pictoEl, plate);
}

function TS_getPictoValue(pictoEl) {
  if (typeof pictoEl === 'string') {
    pictoEl = document.getElementById(pictoEl);
  }
  if (!pictoEl) return { text: '', arasaacId: '' };
  const plate = pictoEl.dataset.PictoValue ? JSON.parse(pictoEl.dataset.PictoValue) : { text: '', arasaacId: '' };
  return TS_normalizePictoValue(plate);
}

function TS_CreateArasaacSelector(options) {
  let panelEl = options.panelEl;
  let searchEl = options.searchEl;
  let resultsEl = options.resultsEl;
  let statusEl = options.statusEl;
  let closeEl = options.closeEl;
  const debounceId = options.debounceId || safeuuid();
  const onPick = typeof options.onPick === 'function' ? options.onPick : () => {};
  let activeContext = null;
  let overlayEl = null;

  if (options.modal === true && !panelEl) {
    const overlayId = safeuuid();
    const panelId = safeuuid();
    const searchId = safeuuid();
    const closeId = safeuuid();
    const statusId = safeuuid();
    const resultsId = safeuuid();

    overlayEl = document.createElement('div');
    overlayEl.id = overlayId;
    overlayEl.style.display = 'none';
    overlayEl.style.position = 'fixed';
    overlayEl.style.inset = '0';
    overlayEl.style.background = 'rgba(0, 0, 0, 0.5)';
    overlayEl.style.zIndex = '10000';
    overlayEl.style.alignItems = 'center';
    overlayEl.style.justifyContent = 'center';
    overlayEl.style.padding = '16px';
    overlayEl.innerHTML = html`
      <div
        id="${panelId}"
        style="background: white; padding: 12px; border-radius: 8px; width: min(680px, 100%); box-shadow: 0 10px 30px rgba(0,0,0,0.2);"
      >
        <div style="display: flex; gap: 6px; align-items: center;">
          <input
            type="text"
            id="${searchId}"
            placeholder="Buscar pictogramas ARASAAC..."
            style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
          />
          <button type="button" class="btn4" id="${closeId}">Cerrar</button>
        </div>
        <div id="${statusId}" style="margin-top: 6px;"></div>
        <div
          id="${resultsId}"
          style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; max-height: 60vh; overflow: auto;"
        ></div>
      </div>
    `;

    document.body.appendChild(overlayEl);
    panelEl = overlayEl.querySelector('#' + panelId);
    searchEl = overlayEl.querySelector('#' + searchId);
    resultsEl = overlayEl.querySelector('#' + resultsId);
    statusEl = overlayEl.querySelector('#' + statusId);
    closeEl = overlayEl.querySelector('#' + closeId);

    overlayEl.addEventListener('click', (event) => {
      if (event.target === overlayEl) {
        close();
      }
    });
  }

  function open(context) {
    activeContext = context || activeContext;
    if (overlayEl) {
      overlayEl.style.display = 'flex';
    } else if (panelEl) {
      panelEl.style.display = 'block';
    }
    if (searchEl) searchEl.focus();
  }

  function close() {
    if (overlayEl) {
      overlayEl.style.display = 'none';
    } else if (panelEl) {
      panelEl.style.display = 'none';
    }
  }

  function renderResults(items, term) {
    if (!resultsEl || !statusEl) return;
    resultsEl.innerHTML = '';
    if (!items.length) {
      statusEl.textContent = `No se encontraron pictogramas para "${term}"`;
      return;
    }
    statusEl.textContent = `${items.length} pictogramas`;
    items.slice(0, 60).forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.display = 'flex';
      btn.style.flexDirection = 'column';
      btn.style.alignItems = 'center';
      btn.style.gap = '4px';
      btn.style.padding = '4px';
      btn.style.border = '1px solid #ddd';
      btn.style.background = 'white';
      btn.style.cursor = 'pointer';

      const img = document.createElement('img');
      img.src = TS_buildArasaacPictogramUrl(item.id);
      img.alt = item.label;
      img.width = 64;
      img.height = 64;
      img.loading = 'lazy';
      img.style.objectFit = 'contain';

      const label = document.createElement('span');
      label.style.fontSize = '12px';
      label.textContent = item.label;

      btn.appendChild(img);
      btn.appendChild(label);
      btn.onclick = () => {
        if (!activeContext) return;
        onPick(activeContext, item);
        close();
      };
      resultsEl.appendChild(btn);
    });
  }

  function search(term) {
    if (!statusEl || !resultsEl) return;
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      statusEl.textContent = 'Escribe al menos 2 caracteres para buscar.';
      resultsEl.innerHTML = '';
      return;
    }
    statusEl.textContent = 'Buscando...';
    fetch(`https://api.arasaac.org/api/pictograms/es/search/${encodeURIComponent(trimmed)}`)
      .then((res) => res.json())
      .then((items) => {
        const pictograms = (Array.isArray(items) ? items : [])
          .map((item) => {
            if (typeof item === 'string' || typeof item === 'number') {
              return { id: item, label: trimmed };
            }
            const id = item._id || item.id;
            const keywords = Array.isArray(item.keywords) ? item.keywords : [];
            const keyword = keywords[0] ? keywords[0].keyword || keywords[0].name : '';
            const label = keyword || item.keyword || item.name || trimmed;
            return { id, label };
          })
          .filter((item) => item.id);
        renderResults(pictograms, trimmed);
      })
      .catch(() => {
        statusEl.textContent = 'Error al buscar pictogramas.';
        resultsEl.innerHTML = '';
      });
  }

  if (closeEl) {
    closeEl.onclick = close;
  }
  if (searchEl) {
    searchEl.addEventListener('input', () =>
      debounce(debounceId, search, 300, [searchEl.value])
    );
  }

  return {
    open,
    close,
  };
}

const wheelcolors = [
  // Your original custom colors
  '#ff0000',
  '#ff00ff',
  '#00ff00',
  '#0000ff',
  '#00ffff',
  '#000000',
  '#69DDFF',
  '#7FB800',
  '#963484',
  '#FF1D15',
  '#FF8600',

  // Precomputed 30° hue-step colors (12 steps, 70% saturation, 50% lightness)
  '#bf3f3f', // 0°
  '#bf9f3f', // 30°
  '#bfff3f', // 60°
  '#7fff3f', // 90°
  '#3fff5f', // 120°
  '#3fffbf', // 150°
  '#3fafff', // 180°
  '#3f3fff', // 210°
  '#9f3fff', // 240°
  '#ff3fff', // 270°
  '#ff3f7f', // 300°
  '#ff3f3f', // 330°
];

// String prototype using the precomputed array
String.prototype.toHex = function () {
  let hash = 0;
  for (let i = 0; i < this.length; i++) {
    hash = (hash * 31 + this.charCodeAt(i)) >>> 0;
  }
  return wheelcolors[hash % wheelcolors.length];
};

function stringToColour(str) {
  return str.toHex();
}

function colorIsDarkAdvanced(bgColor) {
  let color = bgColor.charAt(0) === '#' ? bgColor.substring(1, 7) : bgColor;
  let r = parseInt(color.substring(0, 2), 16); // hexToR
  let g = parseInt(color.substring(2, 4), 16); // hexToG
  let b = parseInt(color.substring(4, 6), 16); // hexToB
  let uicolors = [r / 255, g / 255, b / 255];
  let c = uicolors.map((col) => {
    if (col <= 0.03928) {
      return col / 12.92;
    }
    return Math.pow((col + 0.055) / 1.055, 2.4);
  });
  let L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return L <= 0.179 ? '#FFFFFF' : '#000000';
}

function setLayeredImages(comanda, key) {
  // Base paths for each layer type (adjust paths as needed)
  const basePaths = {
    Selección: 'static/ico/layered1/',
    Café: 'static/ico/layered1/',
    Endulzante: 'static/ico/layered1/',
    Cafeina: 'static/ico/layered1/',
    Leche: 'static/ico/layered1/',
  };

  // Map for Selección to filenames
  const selectionMap = {
    'ColaCao con leche': 'Selección-ColaCao.png',
    Infusión: 'Selección-Infusion.png',
    'Café con leche': 'Selección-CaféLeche.png',
    'Solo Leche': 'Selección-Leche.png',
    'Solo café (sin leche)': 'Selección-CaféSolo.png',
  };

  // Start div with relative positioning for layering
  let html = `<div style="position: relative; width: 200px; height: 200px; background: white; display: inline-block; border: 1px dotted black;">`;

  // Layer 1: Selección image
  const selection = comanda['Selección'];
  if (selectionMap[selection]) {
    html += `<img id="img1-${key}" src="${
      basePaths.Selección + selectionMap[selection]
    }" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">`;
  }

  // Layer 2: Café
  if (comanda.Café) {
    html += `<img id="img2-${key}" src="${basePaths.Café}Café-${comanda.Café}.png" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">`;
  }

  // Layer 3: Endulzante
  if (comanda.Endulzante) {
    html += `<img id="img3-${key}" src="${basePaths.Endulzante}Azucar-${comanda.Endulzante}.png" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">`;
  }

  // Layer 4: Cafeina
  if (comanda.Cafeina) {
    html += `<img id="img4-${key}" src="${basePaths.Cafeina}Cafeina-${comanda.Cafeina}.png" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">`;
  }
  // Layer 5: Leche
  if (comanda.Leche) {
    html += `<img id="img5-${key}" src="${basePaths.Leche}Leche-${comanda.Leche}.png" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">`;
  }
  // Layer 6: Temperatura
  if (comanda.Temperatura) {
    html += `<img id="img6-${key}" src="${basePaths.Leche}Temperatura-${comanda.Temperatura}.png" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">`;
  }
  // Layer 7: Tamaño
  if (comanda.Tamaño) {
    html += `<img id="img7-${key}" src="${basePaths.Leche}Tamaño-${comanda.Tamaño}.png" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">`;
  }

  // Close div
  html += '</div>';

  return html;
}

function addCategory(parent, name, icon, options, values, change_cb = () => {}) {
  var details_0 = document.createElement('details'); // children: img_0, summary_0
  //details_0.open = true;
  var img_0 = document.createElement('img');
  img_0.src = 'static/ico/checkbox_unchecked.png';
  img_0.style.height = '30px';
  if (values[name] != undefined) {
    //details_0.open = true;
    img_0.src = 'static/ico/checkbox.png';
  }
  var summary_0 = document.createElement('summary');
  var span_0 = document.createElement('span');
  span_0.style.float = 'right';
  span_0.append(values[name] || '', ' ', img_0);
  summary_0.append(name, span_0);
  details_0.append(summary_0, document.createElement('br'));
  details_0.style.textAlign = 'center';
  details_0.style.margin = '5px';
  details_0.style.padding = '5px';
  details_0.style.border = '2px solid black';
  details_0.style.borderRadius = '5px';
  details_0.style.backgroundColor = 'white';
  details_0.style.cursor = 'pointer';
  details_0.style.width = 'calc(100% - 25px)';
  details_0.style.display = 'inline-block';
  summary_0.style.padding = '10px';
  // background image at the start of summary_0:
  summary_0.style.backgroundImage = "url('" + icon + "')";
  summary_0.style.backgroundSize = 'contain';
  summary_0.style.backgroundPosition = 'left';
  summary_0.style.backgroundRepeat = 'no-repeat';
  summary_0.style.textAlign = 'left';
  summary_0.style.paddingLeft = '55px';
  parent.append(details_0);

  options.forEach((option) => {
    var btn = document.createElement('button');
    var br1 = document.createElement('br');
    //btn.innerText = option.key + ": " + option.value
    btn.append(option.value);
    // for each image in option.img:

    if (option.img) {
      var br2 = document.createElement('br');
      btn.append(br2);
      option.img.forEach((imgsrc) => {
        var img = document.createElement('img');
        img.src = imgsrc;
        img.style.height = '50px';
        img.style.padding = '5px';
        img.style.backgroundColor = 'white';
        btn.append(img, ' ');
      });
    }
    btn.className = option.className;
    if (values[option.key] == option.value) {
      btn.classList.add('activeSCButton');
    }
    btn.onclick = (event) => {
      var items = details_0.getElementsByClassName('activeSCButton');
      for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('activeSCButton');
      }
      btn.classList.add('activeSCButton');
      values[option.key] = option.value;
      span_0.innerText = option.value;
      change_cb(values);
      img_0.src = 'static/ico/checkbox.png';
      //details_0.open = false; // Disabled due to request
    };
    btn.style.borderRadius = '20px';
    //btn.style.fontSize="17.5px"
    details_0.append(btn);
  });
}

function addCategory_Personas(
  parent,
  options,
  defaultval,
  change_cb = () => {},
  label = 'Persona',
  open_default = false,
  default_empty_text = '- Lista Vacia -',
  show_hidden = false,
) {
  var details_0 = document.createElement('details'); // children: img_0, summary_0
  //details_0.open = true;
  var img_0 = document.createElement('img');
  img_0.src = 'static/ico/checkbox_unchecked.png';
  img_0.style.height = '30px';
  if (defaultval != '') {
    details_0.open = false;
    img_0.src = 'static/ico/checkbox.png';
  }
  var summary_0 = document.createElement('summary');
  var span_0 = document.createElement('span');
  span_0.style.float = 'right';
  var p = SC_Personas[defaultval] || {};
  span_0.append(p.Nombre || '', ' ', img_0);
  summary_0.append(label, span_0);
  details_0.append(summary_0, document.createElement('br'));
  if (open_default == true) {
    details_0.open = true;
  }
  details_0.style.textAlign = 'center';
  details_0.style.margin = '5px';
  details_0.style.padding = '5px';
  details_0.style.border = '2px solid black';
  details_0.style.borderRadius = '5px';
  details_0.style.backgroundColor = 'white';
  details_0.style.cursor = 'pointer';
  details_0.style.width = 'calc(100% - 25px)';
  details_0.style.display = 'inline-block';
  summary_0.style.padding = '10px';
  // background image at the start of summary_0:
  summary_0.style.backgroundImage = "url('static/ico/user.png')";
  summary_0.style.backgroundSize = 'contain';
  summary_0.style.backgroundPosition = 'left';
  summary_0.style.backgroundRepeat = 'no-repeat';
  summary_0.style.textAlign = 'left';
  summary_0.style.paddingLeft = '55px';
  parent.append(details_0);
  var lastreg = '';
  Object.entries(options)
    .map(([_, data]) => {
      data['_key'] = _;
      return data;
    })
    .sort(betterSorter)
    .map((entry) => {
      var key = entry['_key'];
      var value = entry;
      if (value.Oculto == true && !show_hidden) { return; }
      if (lastreg != value.Region.toUpperCase()) {
        lastreg = value.Region.toUpperCase();
        var h3_0 = document.createElement('h2');
        h3_0.style.margin = '0';
        h3_0.style.marginTop = '15px';
        h3_0.innerText = lastreg;
        details_0.append(h3_0);
      }
      var option = value.Nombre;
      var btn = document.createElement('button');
      var br1 = document.createElement('br');
      //btn.innerText = option.key + ": " + option.value
      btn.append(option);

      var br2 = document.createElement('br');
      btn.append(br2);
      var img = document.createElement('img');
      img.src = value.Foto || 'static/ico/user_generic.png';
      // Prefer attachment 'foto' for this persona
      try {
        const personaKey = key;
        if (personaKey) {
          DB.getAttachment('personas', personaKey, 'foto')
            .then((durl) => {
              if (durl) img.src = durl;
            })
            .catch(() => {});
        }
      } catch (e) {}
      img.style.height = '60px';
      img.style.padding = '5px';
      img.style.backgroundColor = 'white';
      btn.append(img, ' ');

      if (defaultval == key) {
        btn.classList.add('activeSCButton');
      }
      btn.onclick = (event) => {
        var items = details_0.getElementsByClassName('activeSCButton');
        for (var i = 0; i < items.length; i++) {
          items[i].classList.remove('activeSCButton');
        }
        btn.classList.add('activeSCButton');
        defaultval = key;
        span_0.innerText = '';
        var img_5 = document.createElement('img');
        img_5.src = value.Foto || 'static/ico/user_generic.png';
        // Prefer attachment 'foto' when available
        try {
          const personaKey2 = key;
          if (personaKey2) {
            DB.getAttachment('personas', personaKey2, 'foto')
              .then((durl) => {
                if (durl) img_5.src = durl;
              })
              .catch(() => {});
          }
        } catch (e) {}
        img_5.style.height = '30px';
        span_0.append(img_5, value.Nombre);
        change_cb(defaultval);
        img_0.src = 'static/ico/checkbox.png';
        //details_0.open = false; // Disabled due to request
      };
      btn.style.borderRadius = '20px';
      //btn.style.fontSize="17.5px"
      details_0.append(btn);
    });
  if (Object.entries(options).length == 0) {
    var btn = document.createElement('b');
    btn.append(default_empty_text);
    details_0.append(btn);
  }
}
const SC_actions_icons = {
  Tamaño: 'static/ico/sizes.png',
  Temperatura: 'static/ico/thermometer2.png',
  Leche: 'static/ico/milk.png',
  Selección: 'static/ico/preferences.png',
  Cafeina: 'static/ico/coffee_bean.png',
  Endulzante: 'static/ico/lollipop.png',
  Receta: 'static/ico/cookies.png',
};
const SC_actions = {
  Selección: [
    {
      value: 'Solo Leche',
      key: 'Selección',
      className: 'btn4',
      img: ['static/ico/milk.png'],
    },
    {
      value: 'Solo café (sin leche)',
      key: 'Selección',
      className: 'btn4',
      img: ['static/ico/coffee_bean.png'],
    },
    {
      value: 'Café con leche',
      key: 'Selección',
      className: 'btn4',
      img: ['static/ico/coffee_bean.png', 'static/ico/milk.png'],
    },
    {
      value: 'ColaCao con leche',
      key: 'Selección',
      className: 'btn4',
      img: ['static/ico/colacao.jpg', 'static/ico/milk.png'],
    },
    {
      value: 'Leche con cereales',
      key: 'Selección',
      className: 'btn4',
      img: ['static/ico/cereales.png', 'static/ico/milk.png'],
    },
    {
      value: 'Infusión',
      key: 'Selección',
      className: 'btn4',
      img: ['static/ico/tea_bag.png'],
    },
  ],
  Tamaño: [
    {
      value: 'Grande',
      key: 'Tamaño',
      className: 'btn1',
      img: ['static/ico/keyboard_key_g.png'],
    },
    {
      value: 'Pequeño',
      key: 'Tamaño',
      className: 'btn1',
      img: ['static/ico/keyboard_key_p.png'],
    },
  ],
  Temperatura: [
    {
      value: 'Caliente',
      key: 'Temperatura',
      className: 'btn2',
      img: ['static/ico/thermometer2.png', 'static/ico/arrow_up_red.png', 'static/ico/fire.png'],
    },
    {
      value: 'Templado',
      key: 'Temperatura',
      className: 'btn2',
      img: ['static/ico/thermometer2.png', 'static/ico/arrow_left_green.png'],
    },
    {
      value: 'Frio',
      key: 'Temperatura',
      className: 'btn2',
      img: [
        'static/ico/thermometer2.png',
        'static/ico/arrow_down_blue.png',
        'static/ico/snowflake.png',
      ],
    },
  ],
  Leche: [
    {
      value: 'de Vaca',
      key: 'Leche',
      className: 'btn3',
      img: ['static/ico/cow.png', 'static/ico/add.png'],
    },
    {
      value: 'Sin lactosa',
      key: 'Leche',
      className: 'btn3',
      img: ['static/ico/cow.png', 'static/ico/delete.png'],
    },
    {
      value: 'Vegetal',
      key: 'Leche',
      className: 'btn3',
      img: ['static/ico/milk.png', 'static/ico/wheat.png'],
    },
    {
      value: 'Almendras',
      key: 'Leche',
      className: 'btn3',
      img: ['static/ico/milk.png', 'static/ico/almond.svg'],
    },
    {
      value: 'Agua',
      key: 'Leche',
      className: 'btn3',
      img: ['static/ico/water_tap.png'],
    },
  ],
  Cafeina: [
    {
      value: 'Con',
      key: 'Cafeina',
      className: 'btn5',
      img: ['static/ico/coffee_bean.png', 'static/ico/add.png'],
    },
    {
      value: 'Sin',
      key: 'Cafeina',
      className: 'btn5',
      img: ['static/ico/coffee_bean.png', 'static/ico/delete.png'],
    },
  ],
  Endulzante: [
    {
      value: 'Az. Blanco',
      key: 'Endulzante',
      className: 'btn6',
      img: ['static/ico/azucar-blanco.jpg'],
    },
    {
      value: 'Az. Moreno',
      key: 'Endulzante',
      className: 'btn6',
      img: ['static/ico/azucar-moreno.png'],
    },
    {
      value: 'Sacarina',
      key: 'Endulzante',
      className: 'btn6',
      img: ['static/ico/sacarina.jpg'],
    },
    {
      value: 'Stevia (Pastillas)',
      key: 'Endulzante',
      className: 'btn6',
      img: ['static/ico/stevia.jpg'],
    },
    {
      value: 'Stevia (Gotas)',
      key: 'Endulzante',
      className: 'btn6',
      img: ['static/ico/stevia-gotas.webp'],
    },
    {
      value: 'Sin',
      key: 'Endulzante',
      className: 'btn6',
      img: ['static/ico/delete.png'],
    },
  ],
  Receta: [
    {
      value: 'Si',
      key: 'Receta',
      className: 'btn7',
      img: ['static/ico/add.png'],
    },
    {
      value: 'No',
      key: 'Receta',
      className: 'btn7',
      img: ['static/ico/delete.png'],
    },
  ],
};
function TS_decrypt(input, secret, callback, table, id) {
  // Accept objects or plaintext strings. Support AES-encrypted entries wrapped as RSA{...}.
  if (typeof input !== 'string') {
    try {
      callback(input, false);
    } catch (e) {
      console.error(e);
    }
    return;
  }

  // Encrypted format marker: RSA{<ciphertext>} where <ciphertext> is CryptoJS AES output
  if (input.startsWith('RSA{') && input.endsWith('}') && typeof CryptoJS !== 'undefined') {
    try {
      var data = input.slice(4, -1);
      var words = CryptoJS.AES.decrypt(data, secret);
      var decryptedUtf8 = null;
      try {
        decryptedUtf8 = words.toString(CryptoJS.enc.Utf8);
      } catch (utfErr) {
        try {
          decryptedUtf8 = words.toString(CryptoJS.enc.Latin1);
        } catch (latinErr) {
          console.warn('TS_decrypt: failed to decode decrypted bytes', utfErr, latinErr);
          try {
            callback(input, 'error');
          } catch (ee) {}
          return;
        }
      }
      var parsed = null;
      try {
        parsed = JSON.parse(decryptedUtf8);
      } catch (pe) {
        parsed = decryptedUtf8;
        try {
          callback(parsed, 'error2');
        } catch (ee) {
          console.error(ee);
        }
        return;
      }
      try {
        callback(parsed, true);
      } catch (e) {
        console.error(e);
      }
      // Keep encrypted at-rest: if table/id provided, ensure DB stores encrypted payload (input)
      // if (table && id && window.DB && DB.put) {
      //   DB.put(table, id, input).catch(() => {});
      // }
      return;
    } catch (e) {
      console.error('TS_decrypt: invalid encrypted payload', e);
      try {
        callback(input, 'error');
      } catch (ee) {}
      return;
    }
  }

  // Plain JSON stored as text -> parse and return, then re-encrypt in DB for at-rest protection
  try {
    var parsed = JSON.parse(input);
    try {
      callback(parsed, false);
    } catch (e) {
      console.error(e);
    }
    if (table && id && window.DB && DB.put && typeof SECRET !== 'undefined') {
      TS_encrypt(parsed, SECRET, function (enc) {
        DB.put(table, id, enc).catch(() => {});
      });
    }
  } catch (e) {
    // Not JSON, return raw string
    try {
      callback(input, false);
    } catch (err) {
      console.error(err);
    }
  }
}
function TS_encrypt(input, secret, callback, mode = 'RSA') {
  // Skip encryption
  //callback(input);
  //return;
  // Encrypt given value for at-rest storage using CryptoJS AES.
  // Always return string of form RSA{<ciphertext>} via callback.
  try {
    if (typeof CryptoJS === 'undefined') {
      // CryptoJS not available — return plaintext
      try {
        callback(input);
      } catch (e) {
        console.error(e);
      }
      return;
    }
    var payload = input;
    if (typeof input !== 'string') {
      try {
        payload = JSON.stringify(input);
      } catch (e) {
        payload = String(input);
      }
    }
    var encrypted = CryptoJS.AES.encrypt(payload, secret).toString();
    var out = 'RSA{' + encrypted + '}';
    try {
      callback(out);
    } catch (e) {
      console.error(e);
    }
  } catch (e) {
    console.error('TS_encrypt: encryption failed', e);
    try {
      callback(input);
    } catch (err) {
      console.error(err);
    }
  }
}
// Listado precargado de personas:
DB.map('personas', (data, key) => {
  function add_row(data, key) {
    if (data != null) {
      data['_key'] = key;
      SC_Personas[key] = data;
    } else {
      delete SC_Personas[key];
    }
  }
  if (typeof data == 'string') {
    TS_decrypt(
      data,
      SECRET,
      (data, wasEncrypted) => {
        add_row(data, key);
      },
      'personas',
      key
    );
  } else {
    add_row(data, key);
  }
});

function SC_parse(json) {
  var out = '';
  Object.entries(json).forEach((entry) => {
    out += entry[0] + ': ' + entry[1] + '\n';
  });
  return out;
}

function SC_parse_short(json) {
  const precios = window.PRECIOS_CAFE || {
    servicio_base: 10,
    leche_pequena: 15,
    leche_grande: 25,
    cafe: 25,
    colacao: 25,
  };
  
  var valores = `<small style='font-size: 60%;'>Servicio base (${precios.servicio_base}c)</small>\n`;

  Object.entries(json).forEach((entry) => {
    valores += "<small style='font-size: 60%;'>" + entry[0] + ':</small> ' + entry[1] + ' ';
    var combo = entry[0] + ';' + entry[1];
    switch (entry[0]) {
      case 'Leche':
        // Leche pequeña
        if (
          json['Tamaño'] == 'Pequeño' &&
          ['de Vaca', 'Sin lactosa', 'Vegetal', 'Almendras'].includes(json['Leche'])
        ) {
          valores += `<small>(P = ${precios.leche_pequena}c)</small>`;
        }
        // Leche grande
        if (
          json['Tamaño'] == 'Grande' &&
          ['de Vaca', 'Sin lactosa', 'Vegetal', 'Almendras'].includes(json['Leche'])
        ) {
          valores += `<small>(G = ${precios.leche_grande}c)</small>`;
        }
        break;
      case 'Selección':
        // Café
        if (['Café con leche', 'Solo café (sin leche)'].includes(json['Selección'])) {
          valores += `<small>(${precios.cafe}c)</small>`;
        }
        // ColaCao
        if (json['Selección'] == 'ColaCao con leche') {
          valores += `<small>(${precios.colacao}c)</small>`;
        }
      default:
        break;
    }

    valores += '\n';
  });
  return valores;
}

function SC_priceCalc(json) {
  var precio = 0;
  var valores = '';
  
  // Usar precios configurables
  const precios = window.PRECIOS_CAFE || {
    servicio_base: 10,
    leche_pequena: 15,
    leche_grande: 25,
    cafe: 25,
    colacao: 25,
  };
  
  // Servicio base
  precio += precios.servicio_base;
  valores += `Servicio base = ${precios.servicio_base}c\n`;
  
  // Leche pequeña
  if (
    json['Tamaño'] == 'Pequeño' &&
    ['de Vaca', 'Sin lactosa', 'Vegetal', 'Almendras'].includes(json['Leche'])
  ) {
    precio += precios.leche_pequena;
    valores += `Leche pequeña = ${precios.leche_pequena}c\n`;
  }
  
  // Leche grande
  if (
    json['Tamaño'] == 'Grande' &&
    ['de Vaca', 'Sin lactosa', 'Vegetal', 'Almendras'].includes(json['Leche'])
  ) {
    precio += precios.leche_grande;
    valores += `Leche grande = ${precios.leche_grande}c\n`;
  }
  
  // Café
  if (['Café con leche', 'Solo café (sin leche)'].includes(json['Selección'])) {
    precio += precios.cafe;
    valores += `Café = ${precios.cafe}c\n`;
  }
  
  // ColaCao
  if (json['Selección'] == 'ColaCao con leche') {
    precio += precios.colacao;
    valores += `ColaCao = ${precios.colacao}c\n`;
  }
  
  valores += '<hr>Total: ' + precio + 'c\n';
  return [precio, valores];
}

function TS_IndexElement(
  pageco,
  config,
  ref,
  container,
  rowCallback = undefined,
  canAddCallback = undefined,
  globalSearchBar = true
) {
  // Every item in config should have:
  // key: string
  // type: string
  // default: string
  // label: string
  var tablebody = safeuuid();
  var tablehead = safeuuid();
  var scrolltable = safeuuid();
  var searchKeyInput = safeuuid();
  var debounce_search = safeuuid();
  var debounce_load = safeuuid();
  var filter_tr = safeuuid();

  // Create the container with search bar and table
  container.innerHTML = html`
    <div id="${scrolltable}">
      <table>
        <thead>
          <tr style="background: transparent;">
            <th colspan="100%" style="padding: 0; background: transparent;">
              <input
                type="text"
                id="${searchKeyInput}"
                placeholder="🔍 Buscar..."
                style="width: calc(100% - 18px); padding: 8px; border: 1px solid #ccc; border-radius: 4px; background-color: rebeccapurple; color: white;"
                value=""
              />
            </th>
          </tr>
          <tr id="${filter_tr}"></tr>
          <tr id="${tablehead}"></tr>
        </thead>
        <tbody id="${tablebody}"></tbody>
      </table>
    </div>
  `;
  tableScroll('#' + scrolltable); // id="scrolltable"
  var tablehead_EL = document.getElementById(tablehead);
  var tablebody_EL = document.getElementById(tablebody);
  var rows = {};
  config.forEach((key) => {
    tablehead_EL.innerHTML += `<th>${key.label || ''}</th>`;
  });
  // Add search functionality
  const searchKeyEl = document.getElementById(searchKeyInput);
  searchKeyEl.addEventListener('input', () => debounce(debounce_search, render, 200, [rows]));
  // If there is a preset search value in URL, apply it
  var hashQuery = new URLSearchParams(window.location.hash.split('?')[1]);
  if (hashQuery.has('search')) {
    searchKeyEl.value = hashQuery.get('search');
  }
  var filters = {};
  if (hashQuery.has('filter')) {
    hashQuery.getAll('filter').forEach((filter) => {
      var [key, value] = filter.split(":");
      filters[key] = value;
    });
    document.getElementById(filter_tr).innerHTML = '<th colspan="100%" style="color: #000; background: #fff;">Filtrando por: ' + Object.entries(filters)
      .map(([key, value]) => `${key}`)
    .join(', ') + ' - <a href="' + window.location.hash.split('?')[0] + '">Limpiar filtros</a></th>';
  }
  function searchInData(data, searchValue, config) {
    if (filters) {
      for (var fkey in filters) {
        if (data[fkey] != filters[fkey]) {
          return false;
        }
      }
    }
    if (!searchValue) return true;

    // Search in ID
    if (data._key.toLowerCase().includes(searchValue)) return true;

    // Search in configured fields
    for (var field of config) {
      const value = data[field.key] || field.default || '';

      // Handle different field types
      switch (field.type) {
        case 'comanda':
          try {
            const comandaData = JSON.parse(data.Comanda);
            // Search in all comanda fields
            if (
              Object.values(comandaData).some((v) => String(v).toLowerCase().includes(searchValue))
            )
              return true;
          } catch (e) {
            // If JSON parse fails, search in raw string
            if (data.Comanda.toLowerCase().includes(searchValue)) return true;
          }
          break;
        case 'persona':
        case 'persona-nombre':
          var persona = SC_Personas[value] || { Nombre: '', Region: '' };
          if (field.self == true) {
            persona = data || { Nombre: '', Region: '' };
          }
          if (persona) {
            // Search in persona fields
            if (persona.Nombre.toLowerCase().includes(searchValue)) return true;
            if (persona.Region.toLowerCase().includes(searchValue)) return true;
          }
          break;
        case 'fecha':
        case 'fecha-iso':
          // Format date as DD/MM/YYYY for searching
          if (value) {
            const fechaArray = value.split('-');
            const formattedDate = `${fechaArray[2]}/${fechaArray[1]}/${fechaArray[0]}`;
            if (formattedDate.includes(searchValue)) return true;
          }
          break;
        case 'picto': {
          const plate = TS_normalizePictoValue(value);
          if (plate.text && plate.text.toLowerCase().includes(searchValue)) return true;
          break;
        }
        default:
          // For raw and other types, search in the direct value
          if (String(value).toLowerCase().includes(searchValue)) return true;
      }
    }
    return false;
  }

  // --- Optimized render function ---
  var lastSearchValue = '';
  var lastFilteredSorted = [];

  function getFilteredSortedRows(searchValue) {
    // Only use cache if searchValue is not empty and cache is valid
    if (searchValue && searchValue === lastSearchValue && lastFilteredSorted.length > 0) {
      return lastFilteredSorted;
    }
    const filtered = Object.entries(rows)
      .filter(([_, data]) => searchInData(data, searchValue, config))
      .map(([_, data]) => data)
      .sort(betterSorter);
    lastSearchValue = searchValue;
    lastFilteredSorted = filtered;
    return filtered;
  }

  function render(rows) {
    const searchValue = searchKeyEl.value.toLowerCase().trim();
    // Use document fragment for batch DOM update
    const fragment = document.createDocumentFragment();
    const filteredSorted = getFilteredSortedRows(searchValue);
    for (let i = 0; i < filteredSorted.length; i++) {
      const data = filteredSorted[i];
      if (canAddCallback != undefined && canAddCallback(data) === true) {
        continue;
      }
      const new_tr = document.createElement('tr');
      if (rowCallback != undefined) {
        rowCallback(data, new_tr);
      }
      config.forEach((key) => {
        switch (key.type) {
          case '_encrypted': {
            const tdEncrypted = document.createElement('td');
            if (data['_encrypted__'] === true) {
              tdEncrypted.innerText = '🔒';
            } else if (
              data['_encrypted__'] === 'error' ||
              data['_encrypted__'] === 'error2' ||
              data['_encrypted__'] === undefined
            ) {
              tdEncrypted.innerText = '⚠️ Error';
            } else {
              tdEncrypted.innerText = '';
            }
            new_tr.appendChild(tdEncrypted);
            break;
          }
          case 'raw':
          case 'text': {
            const tdRaw = document.createElement('td');
            const rawContent = (String(data[key.key]) || key.default || '').replace(/\n/g, '<br>');
            tdRaw.innerHTML = rawContent;
            new_tr.appendChild(tdRaw);
            break;
          }
          case 'moneda': {
            const tdMoneda = document.createElement('td');
            const valor = parseFloat(data[key.key]);
            if (!isNaN(valor)) {
              tdMoneda.innerText = valor.toFixed(2) + ' €';
            } else {
              tdMoneda.innerText = key.default || '';
            }
            new_tr.appendChild(tdMoneda);
            break;
          }
          case 'fecha':
          case 'fecha-iso': {
            const tdFechaISO = document.createElement('td');
            if (data[key.key]) {
              const fechaArray = data[key.key].split('-');
              tdFechaISO.innerText = fechaArray[2] + '/' + fechaArray[1] + '/' + fechaArray[0];
            }
            new_tr.appendChild(tdFechaISO);
            break;
          }
          case 'fecha-diff': {
            const tdFechaISO = document.createElement('td');
            if (data[key.key]) {
              const fecha = new Date(data[key.key]);
              const now = new Date();
              const diffTime = Math.abs(now - fecha);
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              const diffMonths = Math.floor(diffDays / 30);
              const diffYears = Math.floor(diffDays / 365);
              let diffString = '';
              if (diffYears > 0) {
                diffString += diffYears + ' año' + (diffYears > 1 ? 's ' : ' ');
              }
              if (diffMonths % 12 > 0) {
                diffString += (diffMonths % 12) + ' mes' + (diffMonths % 12 > 1 ? 'es ' : ' ');
              }

              // if more than 3 months, show rgb(255, 192, 192) as background
              if (diffMonths >= 3) {
                tdFechaISO.style.backgroundColor = 'rgb(255, 192, 192)';
              } else if (diffMonths >= 1) {
                tdFechaISO.style.backgroundColor = 'rgb(252, 252, 176)';
              }
              tdFechaISO.innerText = diffString.trim();
            }
            new_tr.appendChild(tdFechaISO);
            break;
          }
          case 'picto': {
            const tdPicto = document.createElement('td');
            const plate = TS_normalizePictoValue(data[key.key]);
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.gap = '8px';
            if (plate.arasaacId) {
              const img = document.createElement('img');
              img.src = TS_buildArasaacPictogramUrl(plate.arasaacId);
              img.alt = plate.text || 'Pictograma';
              img.width = 48;
              img.height = 48;
              img.loading = 'lazy';
              img.style.objectFit = 'contain';
              wrapper.appendChild(img);
            }
            if (plate.text) {
              const text = document.createElement('span');
              console.log('Picto data', data, 'normalized', plate);
              text.textContent = data[key.labelkey] || plate.text || '';
              wrapper.appendChild(text);
            }
            tdPicto.appendChild(wrapper);
            new_tr.appendChild(tdPicto);
            break;
          }
          case 'template': {
            const tdCustomTemplate = document.createElement('td');
            new_tr.appendChild(tdCustomTemplate);
            key.template(data, tdCustomTemplate);
            break;
          }
          case 'comanda': {
            const tdComanda = document.createElement('td');
            tdComanda.style.verticalAlign = 'top';
            const parsedComanda = JSON.parse(data.Comanda);
            const precio = SC_priceCalc(parsedComanda)[0];
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = setLayeredImages(parsedComanda, data._key);
            tdComanda.appendChild(tempDiv.firstChild);
            const pre = document.createElement('pre');
            pre.style.fontSize = '15px';
            pre.style.display = 'inline-block';
            pre.style.margin = '0';
            pre.style.verticalAlign = 'top';
            pre.style.padding = '5px';
            pre.style.background = 'rgba(255, 255, 0, 0.5)';
            pre.style.border = '1px solid rgba(0, 0, 0, 0.2)';
            pre.style.borderRadius = '5px';
            pre.style.boxShadow = '2px 2px 5px rgba(0, 0, 0, 0.1)';
            pre.style.height = '100%';
            const spanPrecio = document.createElement('span');
            spanPrecio.style.fontSize = '20px';
            spanPrecio.innerHTML = html`Total: ${precio}c`;
            pre.innerHTML = '<b>Ticket de compra</b> ';
            pre.appendChild(document.createTextNode('\n'));
            pre.innerHTML += SC_parse_short(parsedComanda) + '<hr>' + data.Notas + '<hr>';
            pre.appendChild(spanPrecio);
            tdComanda.appendChild(pre);
            new_tr.appendChild(tdComanda);
            break;
          }
          case 'comanda-status': {
            var sc_nobtn = '';
            if (urlParams.get('sc_nobtn') == 'yes') {
              sc_nobtn = 'pointer-events: none; opacity: 0.5';
            }
            const td = document.createElement('td');
            td.style.fontSize = '17px';
            if (sc_nobtn) {
              td.style.pointerEvents = 'none';
              td.style.opacity = '0.5';
            }
            const createButton = (text, state) => {
              const button = document.createElement('button');
              button.textContent = text;
              if (data.Estado === state) {
                button.className = 'rojo';
              }
              button.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                data.Estado = state;
                if (typeof ref === 'string') {
                  DB.put(ref, data._key, data)
                    .then(() => {
                      toastr.success('Guardado!');
                      render();
                    })
                    .catch((e) => {
                      console.warn('DB.put error', e);
                    });
                } else {
                  try {
                    // legacy
                    ref.get(data._key).put(data);
                    toastr.success('Guardado!');
                  } catch (e) {
                    console.warn('Could not save item', e);
                  }
                }
                return false;
              };
              return button;
            };
            const buttons = [
              createButton('Pedido', 'Pedido'),
              createButton('En preparación', 'En preparación'),
              createButton('Listo', 'Listo'),
              createButton('Entregado', 'Entregado'),
              createButton('Deuda', 'Deuda'),
            ];
            const paidButton = document.createElement('button');
            paidButton.textContent = 'Pagado';
            paidButton.className = 'btn5';
            paidButton.onclick = (event) => {
              event.preventDefault();
              event.stopPropagation();

              // Open Pagos module with pre-filled data
              var precio = SC_priceCalc(JSON.parse(data.Comanda))[0];
              var personaId = data.Persona;
              var comandaId = data._key;

              // Store prefilled data in sessionStorage for Pagos module
              var sdata = JSON.stringify({
                tipo: 'Gasto',
                monto: precio / 100, // Convert cents to euros
                persona: personaId,
                notas: 'Pago de comanda SuperCafé\n' + SC_parse(JSON.parse(data.Comanda)),
                origen: 'SuperCafé',
                origen_id: comandaId,
              });

              // Navigate to datafono
              setUrlHash('pagos,datafono_prefill,' + btoa(sdata));

              return false;
            };
            td.append(data.Fecha);
            td.append(document.createElement('br'));
            buttons.forEach((button) => {
              td.appendChild(button);
              td.appendChild(document.createElement('br'));
            });
            td.appendChild(paidButton);
            new_tr.appendChild(td);
            break;
          }
          case 'persona': {
            let persona = key.self === true ? data : SC_Personas[data[key.key]] || {};
            const regco = stringToColour((persona.Region || '?').toLowerCase());
            const tdPersona = document.createElement('td');
            tdPersona.style.textAlign = 'center';
            tdPersona.style.fontSize = '20px';
            tdPersona.style.backgroundColor = regco;
            tdPersona.style.color = colorIsDarkAdvanced(regco);
            const regionSpan = document.createElement('span');
            regionSpan.style.fontSize = '40px';
            regionSpan.style.textTransform = 'capitalize';
            regionSpan.textContent = (persona.Region || '?').toLowerCase();
            tdPersona.appendChild(regionSpan);
            tdPersona.appendChild(document.createElement('br'));
            const infoSpan = document.createElement('span');
            infoSpan.style.backgroundColor = 'white';
            infoSpan.style.border = '2px solid black';
            infoSpan.style.borderRadius = '5px';
            infoSpan.style.display = 'inline-block';
            infoSpan.style.padding = '5px';
            infoSpan.style.color = 'black';
            const img = document.createElement('img');
            img.src = persona.Foto || 'static/ico/user_generic.png';
            // Prefer attachment 'foto' stored in PouchDB if available
            try {
              const personaId =
                key.self === true ? data._key || data._id || data.id : data[key.key];
              if (personaId) {
                DB.getAttachment('personas', personaId, 'foto')
                  .then((durl) => {
                    if (durl) img.src = durl;
                  })
                  .catch(() => {});
              }
            } catch (e) {
              // ignore
            }
            img.height = 70;
            infoSpan.appendChild(img);
            infoSpan.appendChild(document.createElement('br'));
            infoSpan.appendChild(document.createTextNode(persona.Nombre || ''));
            infoSpan.appendChild(document.createElement('br'));
            if (parseFloat(persona.Monedero_Balance || '0') != 0) {
              const pointsSpan = document.createElement('span');
              pointsSpan.style.fontSize = '17px';
              pointsSpan.textContent =
                parseFloat(persona.Monedero_Balance || '0').toPrecision(2) + ' €';
              infoSpan.appendChild(pointsSpan);
            }
            tdPersona.appendChild(infoSpan);
            new_tr.appendChild(tdPersona);
            break;
          }
          case 'persona-nombre': {
            let persona = key.self === true ? data : SC_Personas[data[key.key]] || {};
            const tdPersonaNombre = document.createElement('td');
            tdPersonaNombre.style.textAlign = 'center';
            tdPersonaNombre.style.fontSize = '20px';
            tdPersonaNombre.textContent = persona.Nombre || '';
            new_tr.appendChild(tdPersonaNombre);
            break;
          }
          case 'attachment-persona': {
            const tdAttachment = document.createElement('td');
            const img = document.createElement('img');
            img.src = data[key.key] || 'static/ico/user_generic.png';
            img.style.maxHeight = '80px';
            img.style.maxWidth = '80px';
            tdAttachment.appendChild(img);
            new_tr.appendChild(tdAttachment);
            // Prefer attachment 'foto' stored in PouchDB if available
            try {
              const personaId =
                key.self === true ? data._key || data._id || data.id : data[key.key];
              if (personaId) {
                DB.getAttachment('personas', personaId, 'foto')
                  .then((durl) => {
                    if (durl) img.src = durl;
                  })
                  .catch(() => {});
              }
            } catch (e) {
              // ignore
            }
            break;
          }
          default:
            break;
        }
      });
      new_tr.onclick = (event) => {
        setUrlHash(pageco + ',' + data._key);
      };
      fragment.appendChild(new_tr);
    }
    // Replace tbody in one operation
    tablebody_EL.innerHTML = '';
    tablebody_EL.appendChild(fragment);
  }
  // Subscribe to dataset updates using DB.map (PouchDB) when `ref` is a table name string
  if (typeof ref === 'string') {
    EventListeners.DB.push(DB.map(ref, (data, key) => {
      function add_row(data, key) {
        if (data != null) {
          data['_key'] = key;
          rows[key] = data;
        } else {
          delete rows[key];
        }
        debounce(debounce_load, render, 200, [rows]);
      }
      if (typeof data == 'string') {
        TS_decrypt(
          data,
          SECRET,
          (data, wasEncrypted) => {
            if (data != null && typeof data === 'object') {
              data['_encrypted__'] = wasEncrypted;
              add_row(data, key);
            }
          },
          ref,
          key
        );
      } else {
        if (data != null && typeof data === 'object') {
          data['_encrypted__'] = false;
        }
        add_row(data, key);
      }
    }));
  }
}

function BuildQR(mid, label) {
  var svgNode = QRCode({
    msg: mid,
    dim: 150,
    pad: 0,
    mtx: -1,
    ecl: 'S',
    ecb: 0,
    pal: ['#000000', '#ffffff'],
    vrb: 0,
  });
  return `
  <span style="border: 2px dashed black; padding: 10px; display: inline-block; background: white; border-radius: 7px; text-align: center; margin: 5px;">
      <b>QR %%TITLE%%</b>
      <br>${svgNode.outerHTML}<br>
      <small>${label || mid}</small>
  </span>
  `;
}

var PAGES = {};
var PERMS = {
  ADMIN: 'Administrador',
};

function checkRole(role) {
  var roles = SUB_LOGGED_IN_DETAILS.Roles || '';
  var rolesArr = roles.split(',');
  if (rolesArr.includes('ADMIN') || rolesArr.includes(role) || AC_BYPASS) {
    return true;
  } else {
    return false;
  }
}
function SetPages() {
  document.getElementById('appendApps2').innerHTML = '';
  Object.keys(PAGES).forEach((key) => {
    if (PAGES[key].Esconder == true) {
      return;
    }
    if (PAGES[key].AccessControl == true) {
      var roles = SUB_LOGGED_IN_DETAILS.Roles || '';
      var rolesArr = roles.split(',');
      if (rolesArr.includes('ADMIN') || rolesArr.includes(PAGES[key].AccessControlRole || key) || AC_BYPASS) {
      } else {
        return;
      }
    }
    var a = document.createElement('a');
    var img = document.createElement('img');
    var label = document.createElement('div');
    a.className = 'ribbon-button';
    a.href = '#' + key;
    label.innerText = PAGES[key].Title;
    label.className = 'label';
    img.src = PAGES[key].icon || 'static/appico/application_enterprise.png';
    a.append(img, label);
    document.getElementById('appendApps2').append(a);
  });
  var a = document.createElement('a');
  var img = document.createElement('img');
  var label = document.createElement('div');
  a.className = 'ribbon-button';
  a.href = '#index,qr';
  label.innerText = 'Escanear QR';
  label.className = 'label';
  img.src = 'static/appico/barcode.png';
  a.append(img, label);
  document.getElementById('appendApps2').append(a);
}
var Booted = false;
var TimeoutBoot = 3; // in loops of 750ms
var BootLoops = 0;

// Get URL host for peer link display
var couchDatabase = localStorage.getItem('TELESEC_COUCH_DBNAME') || 'telesec';
var couchUrl = localStorage.getItem('TELESEC_COUCH_URL') || null;
var couchHost = '';
try {
  var urlObj = new URL(couchUrl);
  couchHost = urlObj.host;
} catch (e) {
  couchHost = couchUrl;
}
if (couchHost) {
  document.getElementById('peerLink').innerText = couchDatabase + '@' + couchHost;
}

const statusImg = document.getElementById('connectStatus');
statusImg.onclick = () => {
  var ribbon = document.getElementById('ribbon-content');
  var alternative_ribbon = document.getElementById('ribbon-content-alternative');
  ribbon.style.display = ribbon.style.display === 'none' ? 'block' : 'none';
  alternative_ribbon.style.display = alternative_ribbon.style.display === 'none' ? 'block' : 'none';
}
function updateStatusOrb() {
  const now = Date.now();
  const recentSync = window.TELESEC_LAST_SYNC && now - window.TELESEC_LAST_SYNC <= 3000;
  if (recentSync) {
    if (statusImg) {
      const syncColor = window.TELESEC_LAST_SYNC_COLOR || 'hsl(200, 70%, 50%)';
      // Semicircle on the right side
      statusImg.src =
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEyIDIyYzUuNTIyIDAgMTAtNC40NzggMTAtMTBTMTcuNTIyIDIgMTIgMnMtdjJoLTJWM2gtMnYyaC0ydjJoLTJWM2gtMnYyaC0ydjJoLTJWM2gtMnYyaC0ydi0yaDJWM2gydjJoMnYyaDJ2MmgyVjNoMmwyIDJ2Mmgydi0yaDJ2MmgyVjNoMnYyYzAgNS41MjIgNC40NzggMTAgMTAgMTB6IiBmaWxsPSIjRkZGIi8+PC9zdmc+';
      statusImg.style.backgroundColor = syncColor;
      statusImg.style.borderRadius = '50%';
    }
    return;
  }
  if (window.navigator && window.navigator.onLine === false) {
    if (statusImg) {
      statusImg.src = 'static/ico/offline.svg';
      statusImg.style.backgroundColor = '';
      statusImg.style.borderRadius = '';
    }
  } else {
    if (statusImg) {
      // statusImg.src = "static/logo.jpg";
      // statusImg.style.backgroundColor = "";
      // statusImg.style.borderRadius = "";
    }
  }
}
updateStatusOrb();
setInterval(updateStatusOrb, 250);

var BootIntervalID = setInterval(() => {
  BootLoops += 1;

  const isOnline = window.navigator ? window.navigator.onLine !== false : true;

  // Check if local DB is initialized and responsive
  const checkLocalDB = () => {
    if (window.DB && DB._internal && DB._internal.local) {
      return DB._internal.local
        .info()
        .then(() => true)
        .catch(() => false);
    }
    return Promise.resolve(false);
  };

  checkLocalDB().then((dbReady) => {
    // If offline, or DB ready, or we've waited long enough, proceed to boot the UI
    if ((dbReady || !isOnline || BootLoops >= TimeoutBoot) && !Booted) {
      Booted = true;
      document.getElementById('loading').style.display = 'none';

      if (!isOnline) {
        toastr.error('Sin conexión! Los cambios se sincronizarán cuando vuelvas a estar en línea.');
      }

      if (!SUB_LOGGED_IN) {
        if (AC_BYPASS) {
          // Auto-create or load a bypass persona and log in automatically
          const bypassId = localStorage.getItem('TELESEC_BYPASS_ID') || 'bypass-admin';
          if (window.DB && DB.get) {
            DB.get('personas', bypassId)
              .then((data) => {
                function finish(pdata, id) {
                  SUB_LOGGED_IN_ID = id || bypassId;
                  SUB_LOGGED_IN_DETAILS = pdata || {};
                  SUB_LOGGED_IN = true;
                  localStorage.setItem('TELESEC_BYPASS_ID', SUB_LOGGED_IN_ID);
                  SetPages();
                  open_page(location.hash.replace('#', '').split("?")[0]);
                }
                if (!data) {
                  const persona = { Nombre: 'Admin (bypass)', Roles: 'ADMIN,' };
                  DB.put('personas', bypassId, persona)
                    .then(() => finish(persona, bypassId))
                    .catch((e) => {
                      console.warn('AC_BYPASS create error', e);
                      open_page('login');
                    });
                } else {
                  if (typeof data === 'string') {
                    TS_decrypt(
                      data,
                      SECRET,
                      (pdata) => finish(pdata, bypassId),
                      'personas',
                      bypassId
                    );
                  } else {
                    finish(data, bypassId);
                  }
                }
              })
              .catch((e) => {
                console.warn('AC_BYPASS persona check error', e);
                open_page('login');
              });
          } else {
            // DB not ready, fallback to login page
            open_page('login');
          }
        } else {
          open_page('login');
        }
      } else {
        SetPages();
        open_page(location.hash.replace('#', '').split("?")[0]);
      }
      clearInterval(BootIntervalID);
    }
  });
}, 750);

const tabs = document.querySelectorAll('.ribbon-tab');
const detailTabs = {
  modulos: document.getElementById('tab-modulos'),
  buscar: document.getElementById('tab-buscar'),
};

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const selected = tab.getAttribute('data-tab');

    // Toggle details
    for (const [key, detailsEl] of Object.entries(detailTabs)) {
      if (key === selected) {
        detailsEl.setAttribute('open', '');
      } else {
        detailsEl.removeAttribute('open');
      }
    }

    // Toggle tab active class
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

// Global Search Functionality
function GlobalSearch() {
  const searchData = {};
  const allSearchableModules = [
    {
      role: 'personas',
      key: 'personas',
      title: 'Personas',
      icon: 'static/appico/File_Person.svg',
      fields: ['Nombre', 'Region', 'Notas', 'email'],
    },
    {
      role: 'materiales',
      key: 'materiales',
      title: 'Materiales',
      icon: 'static/appico/Database.svg',
      fields: ['Nombre', 'Referencia', 'Ubicacion', 'Notas'],
    },
    {
      role: 'supercafe',
      key: 'supercafe',
      title: 'SuperCafé',
      icon: 'static/appico/Coffee.svg',
      fields: ['Persona', 'Comanda', 'Estado'],
    },
    {
      role: 'comedor',
      key: 'comedor',
      title: 'Comedor',
      icon: 'static/appico/Meal.svg',
      fields: ['Fecha', 'Platos'],
    },
    {
      role: 'notas',
      key: 'notas',
      title: 'Notas',
      icon: 'static/appico/Notepad.svg',
      fields: ['Asunto', 'Contenido', 'Autor'],
    },
    {
      role: 'notificaciones',
      key: 'notificaciones',
      title: 'Avisos',
      icon: 'static/appico/Alert_Warning.svg',
      fields: ['Asunto', 'Mensaje', 'Origen', 'Destino'],
    },
    {
      role: 'aulas',
      key: 'aulas_solicitudes',
      title: 'Solicitudes de Aulas',
      icon: 'static/appico/Classroom.svg',
      fields: ['Asunto', 'Contenido', 'Solicitante'],
    },
    {
      role: 'aulas',
      key: 'aulas_informes',
      title: 'Informes de Aulas',
      icon: 'static/appico/Newspaper.svg',
      fields: ['Asunto', 'Contenido', 'Autor', 'Fecha'],
    },
  ];

  // Filter modules based on user permissions
  const searchableModules = allSearchableModules.filter((module) => {
    return checkRole(module.role);
  });

  // Load all data from modules
  function loadAllData() {
    searchableModules.forEach((module) => {
      searchData[module.key] = {};
      DB.map(module.key, (data, key) => {
        if (!data) return;

        function processData(processedData) {
          if (processedData && typeof processedData === 'object') {
            searchData[module.key][key] = {
              _key: key,
              _module: module.key,
              _title: module.title,
              _icon: module.icon,
              ...processedData,
            };
          }
        }

        if (typeof data === 'string') {
          TS_decrypt(data, SECRET, processData);
        } else {
          processData(data);
        }
      });
    });
  }

  // Perform search across all modules
  function performSearch(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) return [];

    const results = [];
    const searchLower = searchTerm.toLowerCase();

    searchableModules.forEach((module) => {
      const moduleData = searchData[module.key] || {};

      Object.values(moduleData).forEach((item) => {
        if (!item) return;

        let relevanceScore = 0;
        let matchedFields = [];

        // Search in key/ID
        if (item._key && item._key.toLowerCase().includes(searchLower)) {
          relevanceScore += 10;
          matchedFields.push('ID');
        }

        // Search in configured fields
        module.fields.forEach((field) => {
          const value = item[field];
          if (!value) return;

          let searchValue = '';

          // Handle special field types
          if (field === 'Persona' && SC_Personas[value]) {
            searchValue = SC_Personas[value].Nombre || '';
          } else if (field === 'Comanda' && typeof value === 'string') {
            try {
              const comandaData = JSON.parse(value);
              searchValue = Object.values(comandaData).join(' ');
            } catch (e) {
              searchValue = value;
            }
          } else {
            searchValue = String(value);
          }

          if (searchValue.toLowerCase().includes(searchLower)) {
            relevanceScore += field === 'Nombre' || field === 'Asunto' ? 5 : 2;
            matchedFields.push(field);
          }
        });

        if (relevanceScore > 0) {
          results.push({
            ...item,
            _relevance: relevanceScore,
            _matchedFields: matchedFields,
          });
        }
      });
    });

    return results.sort((a, b) => b._relevance - a._relevance);
  }

  // Render search results
  function renderResults(results, container) {
    if (results.length === 0) {
      container.innerHTML = html`
        <fieldset>
          <legend>Sin resultados</legend>
          <div>🚫 No se encontraron resultados</div>
          <p>Prueba con otros términos de búsqueda o usa filtros diferentes</p>
        </fieldset>
      `;
      return;
    }

    let html = '';

    // Group by module
    const groupedResults = {};
    results.forEach((result) => {
      if (!groupedResults[result._module]) {
        groupedResults[result._module] = [];
      }
      groupedResults[result._module].push(result);
    });

    Object.entries(groupedResults).forEach(([moduleKey, moduleResults]) => {
      const module = searchableModules.find((m) => m.key === moduleKey);
      if (!module) return;

      html += `
        <fieldset>
          <legend>
            <img src="${module.icon}" height="20"> ${module.title} (${moduleResults.length})
          </legend>
      `;

      moduleResults.slice(0, 5).forEach((result) => {
        let title = result.Nombre || result.Asunto || result._key;
        let subtitle = '';

        // Handle comedor specific display
        if (result._module === 'comedor') {
          title = result.Fecha
            ? `Menú del ${result.Fecha.split('-').reverse().join('/')}`
            : result._key;
          if (result.Platos) {
            subtitle = `🍽️ ${result.Platos.substring(0, 50)}${
              result.Platos.length > 50 ? '...' : ''
            }`;
          }
        } else {
          // Default display for other modules
          if (result.Persona && SC_Personas[result.Persona]) {
            subtitle = `👤 ${SC_Personas[result.Persona].Nombre}`;
          }
          if (result.Fecha) {
            const fecha = result.Fecha.split('-').reverse().join('/');
            subtitle += subtitle ? ` • 📅 ${fecha}` : `📅 ${fecha}`;
          }
          if (result.Region) {
            subtitle += subtitle ? ` • 🌍 ${result.Region}` : `🌍 ${result.Region}`;
          }
        }

        html += `
          <button onclick="navigateToResult('${moduleKey}', '${result._key}')" class="button">
            <strong>${title}</strong>
            ${subtitle ? `<br><small>${subtitle}</small>` : ''}
            <br><code>📍 ${result._matchedFields.join(', ')}</code>
          </button>
        `;
      });

      if (moduleResults.length > 5) {
        let moreLink = moduleKey;
        if (moduleKey === 'aulas_solicitudes') {
          moreLink = 'aulas,solicitudes';
        } else if (moduleKey === 'aulas_informes') {
          moreLink = 'aulas,informes';
        }

        html += `
          <hr>
          <button onclick="setUrlHash('${moreLink}')" class="btn8">
            Ver ${moduleResults.length - 5} resultados más en ${module.title}
          </button>
        `;
      }

      html += '</fieldset>';
    });

    container.innerHTML = html;
  }

  return {
    loadAllData,
    performSearch,
    renderResults,
    getAccessibleModules: () => searchableModules,
  };
}

// Helper function to navigate to search results
function navigateToResult(moduleKey, resultKey) {
  switch (moduleKey) {
    case 'aulas_solicitudes':
      setUrlHash('aulas,solicitudes,' + resultKey);
      break;
    case 'aulas_informes':
      setUrlHash('aulas,informes,' + resultKey);
      break;
    default:
      setUrlHash(moduleKey + ',' + resultKey);
  }
}
