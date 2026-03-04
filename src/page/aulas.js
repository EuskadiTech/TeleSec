PERMS['aulas'] = 'Aulas (Solo docentes!)';
PERMS['aulas:resumen_diario'] = '> Resumen diario';
PERMS['aulas:puntos_interes'] = '> Puntos de interés';
PAGES.aulas = {
  //navcss: "btn1",
  Title: 'Gest-Aula',
  icon: 'static/appico/components.png',
  AccessControl: true,
  index: function () {
    if (!checkRole('aulas')) {
      setUrlHash('index');
      return;
    }
    var data_Comedor = safeuuid();
    var data_Tareas = safeuuid();
    var data_Diario = safeuuid();
    var data_Weather = safeuuid();
    var link_alertas = safeuuid();
    var link_diario = safeuuid();
    var link_actividades = safeuuid();
    var link_puntos_interes = safeuuid();
    container.innerHTML = html`
      <h1>Gestión del Aula</h1>
      <div>
        <fieldset style="float: left;">
          <legend>Atajos de hoy</legend>
          <a class="button" id="${link_alertas}" href="#notas,alertas">
            Alertas
          </a>
          <a class="button btn2" href="#aulas,solicitudes,${safeuuid('')}">
            Solicitar material
          </a>
          <a class="button" id="${link_diario}" href="#aulas,informes,diario-${CurrentISODate()}">
            Informe
          </a>
          <a class="button" id="${link_actividades}" href="#aulas,informes,actividades-${CurrentISODate()}">
            Actividades
          </a>
          <a class="button btn5" href="#aulas,ordenadores">
            Ordenadores
          </a>
          <a class="button btn6" href="#aulas,resumen_diario">
            Resumen Diario
          </a>
        </fieldset>
        <fieldset style="float: left;">
          <legend>Acciones</legend>
          <a class="button" style="font-size: 25px;" href="#aulas,solicitudes">
            Solicitudes de materiales
          </a>
          <a class="button" style="font-size: 25px;" href="#aulas,informes">
            Informes
          </a>
          <a class="button btn8" style="font-size: 25px;" href="#aulas,puntos_interes">
            Puntos de interés
          </a>
        </fieldset>
      </div>
    `;
    
    //#region Contar alertas activas y mostrarlas en el botón
    DB.get('notas', 'alertas')
      .then((res) => TS_decrypt(res, SECRET, (data) => {
        var count = 0;
        // Sumar el total de alertas activas, cada linea de "Contenido"
        // es una alerta, aunque podrían hacerse varias por nota.
        // Ignora lineas que no empiezen por > (por si el profesor escribe algo que no es una alerta)
        data.Contenido.split('\n').forEach((line) => {
          if (line.trim().startsWith('>')) count++;
        });
        if (count > 0) {
          document.getElementById(link_alertas).innerText = `Alertas (${count})`;
          document.getElementById(link_alertas).classList.add('rojo');
        } else {
          document.getElementById(link_alertas).innerText = 'Alertas';
          document.getElementById(link_alertas).classList.remove('rojo');
        }
      }))
      .catch((e) => {
        console.warn('Error contando alertas activas', e);
      });
    //#endregion Contar alertas activas
    //#region Comprobar si hay un diario para hoy y marcar el botón
    DB.get('aulas_informes', 'diario-' + CurrentISODate())
      .then((res) => {
        if (res) {
          document.getElementById(link_diario).classList.add('btn2'); 
        } else {
          document.getElementById(link_diario).classList.remove('btn2');
        }
      })
      .catch((e) => {
        console.warn('Error comprobando diario de hoy', e);
      });
    //#endregion Comprobar diario
    //#region Comprobar si hay un informe de actividades para hoy y contar las actividades (mismo formato que alertas)
    DB.get('aulas_informes', 'actividades-' + CurrentISODate()).then((res) => TS_decrypt(res, SECRET, (data) => {
      var count = 0;
      data.Contenido.split('\n').forEach((line) => {
        if (line.trim().startsWith('>')) count++;
      });
      if (count > 0) {
        document.getElementById(link_actividades).innerText = `Actividades (${count})`;
        document.getElementById(link_actividades).classList.add('btn4');
      } else {
        document.getElementById(link_actividades).innerText = 'Actividades';
        document.getElementById(link_actividades).classList.remove('btn4');
      }
    }))
    .catch((e) => {
      console.warn('Error comprobando actividades de hoy', e);
    });
    //#endregion Comprobar actividades
  },
  _solicitudes: function () {
    const tablebody = safeuuid();
    var btn_new = safeuuid();
    container.innerHTML = html`
      <a class="button" href="#aulas">← Volver a Gestión de Aulas</a>
      <h1>Solicitudes de Material</h1>
      <button id="${btn_new}">Nueva solicitud</button>
      <div id="cont"></div>
    `;
    TS_IndexElement(
      'aulas,solicitudes',
      [
        {
          key: 'Solicitante',
          type: 'persona-nombre',
          default: '',
          label: 'Solicitante',
        },
        {
          key: 'Asunto',
          type: 'raw',
          default: '',
          label: 'Asunto',
        },
      ],
      'aulas_solicitudes',
      document.querySelector('#cont')
    );
    document.getElementById(btn_new).onclick = () => {
      setUrlHash('aulas,solicitudes,' + safeuuid(''));
    };
  },
  _solicitudes__edit: function (mid) {
    var nameh1 = safeuuid();
    var field_asunto = safeuuid();
    var field_contenido = safeuuid();
    var field_autor = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    container.innerHTML = html`
      <a class="button" href="#aulas,solicitudes">← Volver a solicitudes</a>
      <h1>Solicitud <code id="${nameh1}"></code></h1>
      <fieldset style="float: none; width: calc(100% - 40px);max-width: none;">
        <legend>Valores</legend>
        <div style="max-width: 400px;">
          <label>
            Asunto<br />
            <input type="text" id="${field_asunto}" value="" /><br /><br />
          </label>
          <input type="hidden" id="${field_autor}" readonly value="" />
        </div>
        <label>
          Contenido - ¡Incluye el material a solicitar!<br />
          <textarea id="${field_contenido}" style="width: 100%; height: 400px;"></textarea
          ><br /><br />
        </label>
        <hr />
        <button class="saveico" id="${btn_guardar}">
          <img src="static/floppy_disk_green.png" />
          <br>Guardar
        </button>
        <button class="delico" id="${btn_borrar}">
          <img src="static/garbage.png" />
          <br>Borrar
        </button>
      </fieldset>
    `;
    (async () => {
      const data = await DB.get('aulas_solicitudes', mid);
      function load_data(data, ENC = '') {
        document.getElementById(nameh1).innerText = mid;
        document.getElementById(field_asunto).value = data['Asunto'] || '';
        document.getElementById(field_contenido).value = data['Contenido'] || '';
        document.getElementById(field_autor).value = data['Solicitante'] || SUB_LOGGED_IN_ID || '';
      }
      if (typeof data == 'string') {
        TS_decrypt(
          data,
          SECRET,
          (data, wasEncrypted) => {
            load_data(data, '%E');
          },
          'aulas_solicitudes',
          mid
        );
      } else {
        load_data(data || {});
      }
    })();
    document.getElementById(btn_guardar).onclick = () => {
      // Disable button to prevent double-clicking
      var guardarBtn = document.getElementById(btn_guardar);
      if (guardarBtn.disabled) return;

      guardarBtn.disabled = true;
      guardarBtn.style.opacity = '0.5';

      var data = {
        Solicitante: document.getElementById(field_autor).value,
        Contenido: document.getElementById(field_contenido).value,
        Asunto: document.getElementById(field_asunto).value,
      };
      document.getElementById('actionStatus').style.display = 'block';
      DB.put('aulas_solicitudes', mid, data)
        .then(() => {
          toastr.success('Guardado!');
          setTimeout(() => {
            document.getElementById('actionStatus').style.display = 'none';
            setUrlHash('aulas,solicitudes');
          }, SAVE_WAIT);
        })
        .catch((e) => {
          console.warn('DB.put error', e);
          guardarBtn.disabled = false;
          guardarBtn.style.opacity = '1';
          document.getElementById('actionStatus').style.display = 'none';
          toastr.error('Error al guardar la solicitud');
        });
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (confirm('¿Quieres borrar esta solicitud?') == true) {
        DB.del('aulas_solicitudes', mid).then(() => {
          toastr.error('Borrado!');
          setTimeout(() => {
            setUrlHash('aulas,solicitudes');
          }, SAVE_WAIT);
        });
      }
    };
  },
  _informes: function () {
    const tablebody = safeuuid();
    var btn_new = safeuuid();
    var field_new_byday = safeuuid();
    var btn_new_byday = safeuuid();
    container.innerHTML = html`
      <a class="button" href="#aulas">← Volver a Gestión de Aulas</a>
      <h1>Informes</h1>
      <div
        style="display: inline-block; border: 2px solid black; padding: 5px; border-radius: 5px;"
      >
        <b>Por fecha:</b><br />
        <input type="date" id="${field_new_byday}" value="${CurrentISODate()}" />
        <button id="${btn_new_byday}">Abrir / Nuevo</button>
      </div>
      <br />
      <button id="${btn_new}">Nuevo informe</button>
      <div id="cont"></div>
    `;
    TS_IndexElement(
      'aulas,informes',
      [
        {
          key: 'Autor',
          type: 'persona-nombre',
          default: '',
          label: 'Autor',
        },
        {
          key: 'Fecha',
          type: 'fecha',
          default: '',
          label: 'Fecha',
        },
        {
          key: 'Asunto',
          type: 'raw',
          default: '',
          label: 'Asunto',
        },
      ],
      'aulas_informes',
      document.querySelector('#cont')
    );
    document.getElementById(btn_new).onclick = () => {
      setUrlHash('aulas,informes,' + safeuuid(''));
    };
    document.getElementById(btn_new_byday).onclick = () => {
      const day = document.getElementById(field_new_byday).value;
      if (day) {
        setUrlHash('aulas,informes,diario-' + day);
      } else {
        toastr.error('Selecciona un día válido');
      }
    };
  },
  _informes__edit: function (mid) {
    var nameh1 = safeuuid();
    var field_asunto = safeuuid();
    var field_contenido = safeuuid();
    var field_autor = safeuuid();
    var field_fecha = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    var title = '';
    if (mid.startsWith('diario-')) {
      var date = mid.replace('diario-', '').split('-');
      title = 'Informe del ' + date[2] + '/' + date[1] + '/' + date[0];
    } else if (mid.startsWith('actividades-')) {
      var date = mid.replace('actividades-', '').split('-');
      title = 'Actividades para el ' + date[2] + '/' + date[1] + '/' + date[0];
    }
    container.innerHTML = html`
      <a class="button" href="#aulas,informes">← Volver a informes</a>
      <h1>Informe <code id="${nameh1}"></code></h1>
      <fieldset style="float: none; width: calc(100% - 40px);max-width: none;">
        <legend>Valores</legend>
        <div style="max-width: 400px;">
          <label>
            Asunto<br />
            <input type="text" id="${field_asunto}" value="" /><br /><br />
          </label>
          <input type="hidden" id="${field_autor}" readonly value="" />
          <input type="hidden" id="${field_fecha}" value="" />
        </div>
        <label>
          Contenido<br />
          <textarea id="${field_contenido}" style="width: 100%; height: 400px;"></textarea
          ><br /><br />
        </label>
        <hr />
        <button class="saveico" id="${btn_guardar}">
          <img src="static/floppy_disk_green.png" />
          <br>Guardar
        </button>
        <button class="delico" id="${btn_borrar}">
          <img src="static/garbage.png" />
          <br>Borrar
        </button>
      </fieldset>
    `;
    (async () => {
      const data = await DB.get('aulas_informes', mid);
      function load_data(data, ENC = '') {
        document.getElementById(nameh1).innerText = mid;
        document.getElementById(field_asunto).value = data['Asunto'] || title || '';
        document.getElementById(field_contenido).value = data['Contenido'] || '';
        document.getElementById(field_autor).value = data['Autor'] || SUB_LOGGED_IN_ID || '';
        document.getElementById(field_fecha).value =
          data['Fecha'] || mid.startsWith('diario-')
            ? mid.replace('diario-', '')
            : CurrentISODate();
      }
      if (typeof data == 'string') {
        TS_decrypt(data, SECRET, (data) => {
          load_data(data, '%E');
        });
      } else {
        load_data(data || {});
      }
    })();
    document.getElementById(btn_guardar).onclick = () => {
      // Disable button to prevent double-clicking
      var guardarBtn = document.getElementById(btn_guardar);
      if (guardarBtn.disabled) return;

      guardarBtn.disabled = true;
      guardarBtn.style.opacity = '0.5';

      var data = {
        Autor: document.getElementById(field_autor).value,
        Contenido: document.getElementById(field_contenido).value,
        Asunto: document.getElementById(field_asunto).value,
        Fecha: document.getElementById(field_fecha).value || CurrentISODate(),
      };
      document.getElementById('actionStatus').style.display = 'block';
      DB.put('aulas_informes', mid, data)
        .then(() => {
          toastr.success('Guardado!');
          setTimeout(() => {
            document.getElementById('actionStatus').style.display = 'none';
            setUrlHash('aulas,informes');
          }, SAVE_WAIT);
        })
        .catch((e) => {
          console.warn('DB.put error', e);
          guardarBtn.disabled = false;
          guardarBtn.style.opacity = '1';
          document.getElementById('actionStatus').style.display = 'none';
          toastr.error('Error al guardar el informe');
        });
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (confirm('¿Quieres borrar este informe?') == true) {
        DB.del('aulas_informes', mid).then(() => {
          toastr.error('Borrado!');
          setTimeout(() => {
            setUrlHash('aulas,informes');
          }, SAVE_WAIT);
        });
      }
    };
  },
  __decryptIfNeeded: function (table, id, raw) {
    return new Promise((resolve) => {
      if (typeof raw !== 'string') {
        resolve(raw || {});
        return;
      }
      TS_decrypt(
        raw,
        SECRET,
        (data) => {
          resolve(data || {});
        },
        table,
        id
      );
    });
  },
  __leafletPromise: null,
  __ensureLeaflet: function () {
    if (window.L && typeof window.L.map === 'function') {
      return Promise.resolve(window.L);
    }
    if (PAGES.aulas.__leafletPromise) {
      return PAGES.aulas.__leafletPromise;
    }

    PAGES.aulas.__leafletPromise = new Promise((resolve, reject) => {
      try {
        if (!document.getElementById('telesec-leaflet-css')) {
          var css = document.createElement('link');
          css.id = 'telesec-leaflet-css';
          css.rel = 'stylesheet';
          css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
          css.crossOrigin = '';
          document.head.appendChild(css);
        }

        if (window.L && typeof window.L.map === 'function') {
          resolve(window.L);
          return;
        }

        var existing = document.getElementById('telesec-leaflet-js');
        if (existing) {
          existing.addEventListener('load', () => resolve(window.L));
          existing.addEventListener('error', () => reject(new Error('No se pudo cargar Leaflet')));
          return;
        }

        var script = document.createElement('script');
        script.id = 'telesec-leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.onload = () => resolve(window.L);
        script.onerror = () => reject(new Error('No se pudo cargar Leaflet'));
        document.body.appendChild(script);
      } catch (e) {
        reject(e);
      }
    });

    return PAGES.aulas.__leafletPromise;
  },
  __getServerNow: async function () {
    try {
      var couchUrl = (localStorage.getItem('TELESEC_COUCH_URL') || '').replace(/\/$/, '');
      var couchUser = localStorage.getItem('TELESEC_COUCH_USER') || '';
      var couchPass = localStorage.getItem('TELESEC_COUCH_PASS') || '';
      var couchDb = localStorage.getItem('TELESEC_COUCH_DBNAME') || 'telesec';

      if (couchUrl) {
        var target = couchUrl + '/' + encodeURIComponent(couchDb);
        var headers = {};
        if (couchUser) {
          headers['Authorization'] = 'Basic ' + btoa(couchUser + ':' + couchPass);
        }
        var res = await fetch(target, { method: 'HEAD', headers: headers });
        var dateHeader = res.headers.get('Date');
        if (dateHeader) {
          var dt = new Date(dateHeader);
          if (!isNaN(dt.getTime())) return dt;
        }
      }
    } catch (e) {
      console.warn('No se pudo obtener hora desde CouchDB', e);
    }

    try {
      var wres = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
      if (wres.ok) {
        var wjson = await wres.json();
        if (wjson && wjson.utc_datetime) {
          var wdt = new Date(wjson.utc_datetime);
          if (!isNaN(wdt.getTime())) return wdt;
        }
      }
    } catch (e2) {
      console.warn('No se pudo obtener hora desde worldtimeapi', e2);
    }

    return new Date();
  },
  __scheduleShutdown: async function (machineId) {
    try {
      document.getElementById('actionStatus').style.display = 'block';
      var serverNow = await PAGES.aulas.__getServerNow();
      var shutdownAt = new Date(serverNow.getTime() + 2 * 60 * 1000).toISOString();
      var raw = await DB.get('aulas_ordenadores', machineId);
      var data = await PAGES.aulas.__decryptIfNeeded('aulas_ordenadores', machineId, raw);
      data = data || {};
      data.Hostname = data.Hostname || machineId;
      data.ShutdownBeforeDate = shutdownAt;
      data.ShutdownRequestedAt = serverNow.toISOString();
      data.ShutdownRequestedBy = SUB_LOGGED_IN_ID || '';
      await DB.put('aulas_ordenadores', machineId, data);
      toastr.warning('Apagado programado antes de: ' + shutdownAt);
    } catch (e) {
      console.warn('Error programando apagado remoto', e);
      toastr.error('No se pudo programar el apagado remoto');
    } finally {
      document.getElementById('actionStatus').style.display = 'none';
    }
  },
  __cancelShutdown: async function (machineId) {
    try {
      document.getElementById('actionStatus').style.display = 'block';
      var raw = await DB.get('aulas_ordenadores', machineId);
      var data = await PAGES.aulas.__decryptIfNeeded('aulas_ordenadores', machineId, raw);
      data = data || {};
      data.Hostname = data.Hostname || machineId;
      data.ShutdownBeforeDate = '';
      data.ShutdownRequestedAt = '';
      data.ShutdownRequestedBy = '';
      await DB.put('aulas_ordenadores', machineId, data);
      toastr.success('Apagado remoto cancelado');
    } catch (e) {
      console.warn('Error cancelando apagado remoto', e);
      toastr.error('No se pudo cancelar el apagado remoto');
    } finally {
      document.getElementById('actionStatus').style.display = 'none';
    }
  },
  _ordenadores: function () {
    container.innerHTML = html`
      <a class="button" href="#aulas">← Volver a Gestión de Aulas</a>
      <h1>Control de ordenadores</h1>
      <p>
        Estado enviado por el agente Windows. El apagado remoto se programa con hora de servidor.
      </p>
      <div id="cont"></div>
    `;

    TS_IndexElement(
      'aulas,ordenadores',
      [
        { key: 'Hostname', type: 'raw', default: '', label: 'Hostname' },
        { key: 'UsuarioActual', type: 'raw', default: '', label: 'Usuario actual' },
        { key: 'AppActualEjecutable', type: 'raw', default: '', label: 'App actual (exe)' },
        { key: 'AppActualTitulo', type: 'raw', default: '', label: 'App actual (título)' },
        { key: 'LastSeenAt', type: 'raw', default: '', label: 'Último visto (server)' },
        {
          key: 'ShutdownBeforeDate',
          type: 'template',
          label: 'Apagado remoto',
          template: (data, td) => {
            var text = document.createElement('div');
            text.style.marginBottom = '6px';
            text.innerText = data.ShutdownBeforeDate
              ? '⏻ Antes de: ' + data.ShutdownBeforeDate
              : 'Sin apagado programado';
            td.appendChild(text);

            var btnOn = document.createElement('button');
            btnOn.className = 'rojo';
            btnOn.innerText = 'Programar +2m';
            btnOn.onclick = async (event) => {
              event.preventDefault();
              event.stopPropagation();
              await PAGES.aulas.__scheduleShutdown(data._key);
              return false;
            };
            td.appendChild(btnOn);

            if (data.ShutdownBeforeDate) {
              td.appendChild(document.createElement('br'));
              var btnCancel = document.createElement('button');
              btnCancel.className = 'btn5';
              btnCancel.innerText = 'Cancelar';
              btnCancel.onclick = async (event) => {
                event.preventDefault();
                event.stopPropagation();
                await PAGES.aulas.__cancelShutdown(data._key);
                return false;
              };
              td.appendChild(btnCancel);
            }
          },
        },
      ],
      'aulas_ordenadores',
      document.querySelector('#cont')
    );
  },
  _ordenadores__edit: function (mid) {
    var field_host = safeuuid();
    var field_user = safeuuid();
    var field_exe = safeuuid();
    var field_title = safeuuid();
    var field_seen = safeuuid();
    var field_shutdown = safeuuid();
    var btn_schedule = safeuuid();
    var btn_cancel = safeuuid();

    container.innerHTML = html`
      <a class="button" href="#aulas,ordenadores">← Volver a ordenadores</a>
      <h1>Ordenador <code>${mid}</code></h1>
      <fieldset style="float: none; width: calc(100% - 40px);max-width: none;">
        <legend>Estado</legend>
        <label>Hostname<br /><input readonly id="${field_host}" /></label><br /><br />
        <label>Usuario actual<br /><input readonly id="${field_user}" /></label><br /><br />
        <label>App actual (exe)<br /><input readonly id="${field_exe}" /></label><br /><br />
        <label>App actual (título)<br /><input readonly id="${field_title}" /></label><br /><br />
        <label>Último visto (server)<br /><input readonly id="${field_seen}" /></label><br /><br />
        <label>ShutdownBeforeDate<br /><input readonly id="${field_shutdown}" /></label><br /><br />
        <button class="rojo" id="${btn_schedule}">Programar apagado +2m</button>
        <button class="btn5" id="${btn_cancel}">Cancelar apagado</button>
      </fieldset>
    `;

    async function loadData() {
      var raw = await DB.get('aulas_ordenadores', mid);
      var data = await PAGES.aulas.__decryptIfNeeded('aulas_ordenadores', mid, raw);
      data = data || {};
      document.getElementById(field_host).value = data.Hostname || mid;
      document.getElementById(field_user).value = data.UsuarioActual || '';
      document.getElementById(field_exe).value = data.AppActualEjecutable || '';
      document.getElementById(field_title).value = data.AppActualTitulo || '';
      document.getElementById(field_seen).value = data.LastSeenAt || '';
      document.getElementById(field_shutdown).value = data.ShutdownBeforeDate || '';
    }

    loadData();
    document.getElementById(btn_schedule).onclick = async () => {
      await PAGES.aulas.__scheduleShutdown(mid);
      await loadData();
    };
    document.getElementById(btn_cancel).onclick = async () => {
      await PAGES.aulas.__cancelShutdown(mid);
      await loadData();
    };
  },
  _puntos_interes: function () {
    var map_id = safeuuid();
    var btn_new = safeuuid();
    var btn_my_gps = safeuuid();

    container.innerHTML = html`
      <a class="button" href="#aulas">← Volver a Gestión de Aulas</a>
      <h1>Puntos de interés</h1>
      <p>Registra ubicaciones (tiendas, bares, entidades, etc.) y visualízalas en el mapa.</p>
      <button id="${btn_new}">Nuevo punto</button>
      <button class="btn5" id="${btn_my_gps}">Centrar en mi GPS</button>
      <div id="${map_id}" style="height: 380px; border: 2px solid black; margin-top: 8px; border-radius: 8px;"></div>
      <div id="cont"></div>
    `;

    var map = null;
    var layer = null;
    var markers = {};

    function parseCoord(value) {
      if (value === null || value === undefined || value === '') return null;
      var parsed = parseFloat(String(value).replace(',', '.'));
      return isNaN(parsed) ? null : parsed;
    }

    function updateMarker(data) {
      if (!map || !layer || !data || !data._key) return;
      var lat = parseCoord(data.Latitud);
      var lng = parseCoord(data.Longitud);
      if (lat === null || lng === null) {
        if (markers[data._key]) {
          layer.removeLayer(markers[data._key]);
          delete markers[data._key];
        }
        return;
      }

      var popup = '<b>' + (data.Nombre || data._key) + '</b>';
      if (data.Tipo) popup += '<br>' + data.Tipo;
      if (data.Direccion) popup += '<br>' + data.Direccion;

      if (markers[data._key]) {
        markers[data._key].setLatLng([lat, lng]).bindPopup(popup);
      } else {
        markers[data._key] = L.marker([lat, lng]).addTo(layer).bindPopup(popup);
      }
    }

    function removeMarker(key) {
      if (!layer) return;
      if (markers[key]) {
        layer.removeLayer(markers[key]);
        delete markers[key];
      }
    }

    function focusPoint(data) {
      if (!map) return;
      var lat = parseCoord(data.Latitud);
      var lng = parseCoord(data.Longitud);
      if (lat === null || lng === null) {
        toastr.error('Este punto no tiene coordenadas válidas');
        return;
      }
      map.setView([lat, lng], 17);
      if (markers[data._key]) {
        markers[data._key].openPopup();
      }
    }

    TS_IndexElement(
      'aulas,puntos_interes',
      [
        { key: 'Nombre', type: 'raw', default: '', label: 'Nombre' },
        { key: 'Tipo', type: 'raw', default: '', label: 'Tipo' },
        { key: 'Direccion', type: 'raw', default: '', label: 'Dirección' },
        {
          key: 'Latitud',
          type: 'template',
          label: 'Ubicación',
          template: (data, td) => {
            var lat = parseCoord(data.Latitud);
            var lng = parseCoord(data.Longitud);
            if (lat === null || lng === null) {
              td.innerText = 'Sin coordenadas';
              return;
            }

            var txt = document.createElement('div');
            txt.innerText = lat.toFixed(6) + ', ' + lng.toFixed(6);
            td.appendChild(txt);

            var btn = document.createElement('button');
            btn.className = 'btn6';
            btn.innerText = 'Ver en mapa';
            btn.onclick = (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              focusPoint(data);
              return false;
            };
            td.appendChild(btn);
          },
        },
      ],
      'aulas_puntos_interes',
      document.querySelector('#cont')
    );

    document.getElementById(btn_new).onclick = () => {
      setUrlHash('aulas,puntos_interes,' + safeuuid(''));
    };

    document.getElementById(btn_my_gps).onclick = () => {
      if (!navigator.geolocation) {
        toastr.error('Tu navegador no soporta geolocalización');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!map) return;
          map.setView([pos.coords.latitude, pos.coords.longitude], 16);
          L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
            radius: 8,
            color: '#2b8a3e',
            fillColor: '#2b8a3e',
            fillOpacity: 0.7,
          })
            .addTo(map)
            .bindPopup('Tu ubicación actual')
            .openPopup();
        },
        (err) => {
          console.warn('Error obteniendo GPS', err);
          toastr.error('No se pudo obtener la ubicación GPS');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    (async () => {
      try {
        await PAGES.aulas.__ensureLeaflet();
        map = L.map(map_id).setView([40.4168, -3.7038], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);
        layer = L.layerGroup().addTo(map);

        EventListeners.DB.push(
          DB.map('aulas_puntos_interes', (raw, key) => {
            if (raw === null) {
              removeMarker(key);
              return;
            }
            PAGES.aulas
              .__decryptIfNeeded('aulas_puntos_interes', key, raw)
              .then((data) => {
                data = data || {};
                data._key = key;
                updateMarker(data);
              })
              .catch((e) => {
                console.warn('Error cargando punto de interés para mapa', e);
              });
          })
        );
      } catch (e) {
        console.warn('Leaflet no disponible', e);
        toastr.error('No se pudo cargar el mapa');
      }
    })();
  },
  _puntos_interes__edit: function (mid) {
    var field_nombre = safeuuid();
    var field_tipo = safeuuid();
    var field_direccion = safeuuid();
    var field_descripcion = safeuuid();
    var field_lat = safeuuid();
    var field_lng = safeuuid();
    var btn_gps = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    var map_id = safeuuid();

    container.innerHTML = html`
      <a class="button" href="#aulas,puntos_interes">← Volver a puntos de interés</a>
      <h1>Punto de interés <code>${mid}</code></h1>
      <fieldset style="float: none; width: calc(100% - 40px); max-width: none;">
        <legend>Datos</legend>
        <label>Nombre<br /><input type="text" id="${field_nombre}" /></label><br /><br />
        <label>Tipo (tienda, bar, entidad...)<br /><input type="text" id="${field_tipo}" /></label><br /><br />
        <label>Dirección<br /><input type="text" id="${field_direccion}" style="width: calc(100% - 20px);" /></label><br /><br />
        <label>Descripción<br /><textarea id="${field_descripcion}" style="width: 100%; height: 120px;"></textarea></label><br /><br />
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: end;">
          <label>Latitud<br /><input type="text" id="${field_lat}" placeholder="40.4168" /></label>
          <label>Longitud<br /><input type="text" id="${field_lng}" placeholder="-3.7038" /></label>
          <button class="btn5" id="${btn_gps}">Usar GPS</button>
        </div>
        <br />
        <div id="${map_id}" style="height: 360px; border: 2px solid black; border-radius: 8px;"></div>
        <hr />
        <button class="saveico" id="${btn_guardar}">
          <img src="static/floppy_disk_green.png" />
          <br>Guardar
        </button>
        <button class="delico" id="${btn_borrar}">
          <img src="static/garbage.png" />
          <br>Borrar
        </button>
      </fieldset>
    `;

    var map = null;
    var marker = null;

    function parseCoord(value) {
      if (value === null || value === undefined || value === '') return null;
      var parsed = parseFloat(String(value).replace(',', '.'));
      return isNaN(parsed) ? null : parsed;
    }

    function setCoordInputs(lat, lng) {
      document.getElementById(field_lat).value =
        lat === null || lat === undefined ? '' : Number(lat).toFixed(6);
      document.getElementById(field_lng).value =
        lng === null || lng === undefined ? '' : Number(lng).toFixed(6);
    }

    function refreshMarker(centerMap = false) {
      if (!map) return;
      var lat = parseCoord(document.getElementById(field_lat).value);
      var lng = parseCoord(document.getElementById(field_lng).value);

      if (lat === null || lng === null) {
        if (marker) {
          map.removeLayer(marker);
          marker = null;
        }
        return;
      }

      if (!marker) {
        marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on('dragend', (ev) => {
          var ll = ev.target.getLatLng();
          setCoordInputs(ll.lat, ll.lng);
        });
      } else {
        marker.setLatLng([lat, lng]);
      }

      if (centerMap) {
        map.setView([lat, lng], 17);
      }
    }

    (async () => {
      try {
        await PAGES.aulas.__ensureLeaflet();
        map = L.map(map_id).setView([40.4168, -3.7038], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        map.on('click', (ev) => {
          setCoordInputs(ev.latlng.lat, ev.latlng.lng);
          refreshMarker(false);
        });

        var raw = await DB.get('aulas_puntos_interes', mid);
        var data = await PAGES.aulas.__decryptIfNeeded('aulas_puntos_interes', mid, raw);
        data = data || {};

        document.getElementById(field_nombre).value = data.Nombre || '';
        document.getElementById(field_tipo).value = data.Tipo || '';
        document.getElementById(field_direccion).value = data.Direccion || '';
        document.getElementById(field_descripcion).value = data.Descripcion || '';
        setCoordInputs(parseCoord(data.Latitud), parseCoord(data.Longitud));
        refreshMarker(true);
      } catch (e) {
        console.warn('Error iniciando mapa de punto de interés', e);
        toastr.error('No se pudo cargar el mapa del punto de interés');
      }
    })();

    document.getElementById(field_lat).addEventListener('input', () => refreshMarker(false));
    document.getElementById(field_lng).addEventListener('input', () => refreshMarker(false));

    document.getElementById(btn_gps).onclick = (ev) => {
      ev.preventDefault();
      if (!navigator.geolocation) {
        toastr.error('Tu navegador no soporta geolocalización');
        return false;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordInputs(pos.coords.latitude, pos.coords.longitude);
          refreshMarker(true);
          toastr.success('Ubicación GPS capturada');
        },
        (err) => {
          console.warn('Error GPS', err);
          toastr.error('No se pudo obtener tu ubicación GPS');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
      return false;
    };

    document.getElementById(btn_guardar).onclick = () => {
      var guardarBtn = document.getElementById(btn_guardar);
      if (guardarBtn.disabled) return;

      var lat = parseCoord(document.getElementById(field_lat).value);
      var lng = parseCoord(document.getElementById(field_lng).value);
      var hasLat = document.getElementById(field_lat).value.trim() !== '';
      var hasLng = document.getElementById(field_lng).value.trim() !== '';

      if ((hasLat && lat === null) || (hasLng && lng === null) || (hasLat !== hasLng)) {
        toastr.error('Introduce latitud y longitud válidas');
        return;
      }

      guardarBtn.disabled = true;
      guardarBtn.style.opacity = '0.5';

      var data = {
        Nombre: document.getElementById(field_nombre).value,
        Tipo: document.getElementById(field_tipo).value,
        Direccion: document.getElementById(field_direccion).value,
        Descripcion: document.getElementById(field_descripcion).value,
        Latitud: lat === null ? '' : Number(lat).toFixed(6),
        Longitud: lng === null ? '' : Number(lng).toFixed(6),
        UpdatedAt: new Date().toISOString(),
        Autor: SUB_LOGGED_IN_ID || '',
      };

      document.getElementById('actionStatus').style.display = 'block';
      DB.put('aulas_puntos_interes', mid, data)
        .then(() => {
          toastr.success('Guardado!');
          setTimeout(() => {
            document.getElementById('actionStatus').style.display = 'none';
            setUrlHash('aulas,puntos_interes');
          }, SAVE_WAIT);
        })
        .catch((e) => {
          console.warn('DB.put error', e);
          guardarBtn.disabled = false;
          guardarBtn.style.opacity = '1';
          document.getElementById('actionStatus').style.display = 'none';
          toastr.error('Error al guardar el punto de interés');
        });
    };

    document.getElementById(btn_borrar).onclick = () => {
      if (confirm('¿Quieres borrar este punto de interés?') == true) {
        DB.del('aulas_puntos_interes', mid).then(() => {
          toastr.error('Borrado!');
          setTimeout(() => {
            setUrlHash('aulas,puntos_interes');
          }, SAVE_WAIT);
        });
      }
    };
  },
  _resumen_diario: function () {
    var data_Comedor = safeuuid();
    var data_Tareas = safeuuid();
    var data_Diario = safeuuid();
    var data_Weather = safeuuid();
    if (!checkRole('aulas:resumen_diario')) {
      setUrlHash('index');
      return;
    }
    container.innerHTML = html`
      <h1>Resumen Diario ${CurrentISODate()}</h1>
      <button onclick="print()" class="no_print">Imprimir</button>
      <a class="button no_print" href="#aulas">← Volver a Gestión de Aulas</a>
      <br /><span
        class="btn7"
        style="display: inline-block; margin: 5px; padding: 5px; border-radius: 5px; border: 2px solid black;"
        ><b>Menú Comedor:</b> <br /><span id="${data_Comedor}">Cargando...</span></span
      >
      <br /><span
        class="btn6"
        style="display: inline-block; margin: 5px; padding: 5px; border-radius: 5px; border: 2px solid black;"
        ><b>Tareas:</b> <br />
        <pre style="overflow-wrap: break-word;white-space:pre-wrap;" id="${data_Tareas}">
Cargando...</pre
        >
      </span>
      <br /><span
        class="btn5"
        style="display: inline-block; margin: 5px; padding: 5px; border-radius: 5px; border: 2px solid black;"
        ><b>Informe:</b> <br />
        <pre style="overflow-wrap: break-word;white-space:pre-wrap;" id="${data_Diario}">
Cargando...</pre
        >
      </span>
      <br /><span
        class="btn4"
        style="display: inline-block; margin: 5px; padding: 5px; border-radius: 5px; border: 2px solid black;"
        ><b>Clima:</b> <br /><img
          loading="lazy"
          style="padding: 15px; background-color: white; height: 75px;"
          id="${data_Weather}"
      /></span>
    `;

    //#region Cargar Clima
    // Get location from DB settings.weather_location; if missing ask user and save it
    // url format: https://wttr.in/<loc>?F0m
    DB.get('settings', 'weather_location').then((loc) => {
      if (!loc) {
        loc = prompt('Introduce tu ubicación para el clima (ciudad, país):', 'Madrid, Spain');
        if (loc) {
          DB.put('settings', 'weather_location', loc);
        }
      }
      if (loc) {
        document.getElementById(data_Weather).src =
          'https://wttr.in/' + encodeURIComponent(loc) + '_IF0m_background=FFFFFF.png';
      } else {
        document.getElementById(data_Weather).src = 'https://wttr.in/_IF0m_background=FFFFFF.png';
      }
    });
    //#endregion Cargar Clima
    //#region Cargar Comedor
    DB.get('comedor', CurrentISODate()).then((data) => {
      function add_row(data) {
        if (!data.Primero) {
          var result = 'No hay información del comedor para hoy.';
        } else {
          var result = data.Primero + "<br>" + data.Segundo + "<br>" + data.Postre;
        }
        // Display platos
        document.getElementById(data_Comedor).innerHTML = result;
      }
      if (typeof data == 'string') {
        TS_decrypt(
          data,
          SECRET,
          (data, wasEncrypted) => {
            add_row(data || {});
          },
          'comedor',
          CurrentISODate()
        );
      } else {
        add_row(data || {});
      }
    });
    //#endregion Cargar Comedor
    //#region Cargar Tareas
    DB.get('notas', 'tareas').then((data) => {
      function add_row(data) {
        // Fix newlines
        data.Contenido = data.Contenido || 'No hay tareas.';
        // Display tareas
        document.getElementById(data_Tareas).innerHTML = data.Contenido.replace(/\n/g, '<br>');
      }
      if (typeof data == 'string') {
        TS_decrypt(
          data,
          SECRET,
          (data, wasEncrypted) => {
            add_row(data || {});
          },
          'notas',
          'tareas'
        );
      } else {
        add_row(data || {});
      }
    });
    //#endregion Cargar Tareas
    //#region Cargar Diario
    DB.get('aulas_informes', 'diario-' + CurrentISODate()).then((data) => {
      function add_row(data) {
        // Fix newlines
        data.Contenido = data.Contenido || 'No hay un diario.';
        // Display platos
        document.getElementById(data_Diario).innerHTML = data.Contenido.replace(/\n/g, '<br>');
      }
      if (typeof data == 'string') {
        TS_decrypt(
          data,
          SECRET,
          (data, wasEncrypted) => {
            add_row(data || {});
          },
          'aulas_informes',
          'diario-' + CurrentISODate()
        );
      } else {
        add_row(data || {});
      }
    });
    //#endregion Cargar Diario
  },
  edit: function (fsection) {
    if (!checkRole('aulas')) {
      setUrlHash('index');
      return;
    }
    var section = fsection.split(',')[0];
    var item = location.hash.replace('#', '').split("?")[0].split(',')[2];
    if (!item) {
      // No item, show section
      switch (section) {
        case 'solicitudes':
          this._solicitudes();
          break;
        case 'informes':
          this._informes();
          break;
        case 'ordenadores':
          this._ordenadores();
          break;
        case 'puntos_interes':
          this._puntos_interes();
          break;
        case 'resumen_diario':
          this._resumen_diario();
          break;
        default:
          this.index();
          break;
      }
    } else {
      // Show section__edit
      switch (section) {
        case 'solicitudes':
          this._solicitudes__edit(item);
          break;
        case 'informes':
          this._informes__edit(item);
          break;
        case 'ordenadores':
          this._ordenadores__edit(item);
          break;
        case 'puntos_interes':
          this._puntos_interes__edit(item);
          break;
      }
    }
  },
};
