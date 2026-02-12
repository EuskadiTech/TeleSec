PAGES.dataman = {
  navcss: 'btn1',
  icon: 'static/appico/gear_edit.png',
  AccessControl: true,
  Title: 'Ajustes',
  edit: function (mid) {
    switch (mid) {
      case 'export':
        PAGES.dataman.__export();
        break;
      case 'import':
        PAGES.dataman.__import();
        break;
      case 'config':
        PAGES.dataman.__config();
        break;
      case 'labels':
        PAGES.dataman.__labels();
        break;
      case 'precios':
        PAGES.dataman.__precios();
        break;
      default:
      // Tab to edit
    }
  },
  __config: function () {
    var form = safeuuid();
    container.innerHTML = html`
      <h1>Ajustes</h1>
      <h2>No disponible</h2>
      <form id="${form}">
        <label>
          <input type="checkbox" name="block_add_account" value="yes" />
          <b>Bloquear crear cuenta de administrador?</b>
        </label>
        <button type="submit">Aplicar ajustes</button>
      </form>
    `;
    document.getElementById(form).onsubmit = (ev) => {
      ev.preventDefault();
      var ford = new FormData(document.getElementById(form));
      if (ford.get('block_add_account') == 'yes') {
        config['block_add_account'] = true;
      }
    };
  },
  __export: function () {
    var button_export_local = safeuuid();
    var button_export_safe = safeuuid();
    container.innerHTML = html`
      <h1>Exportar Datos</h1>
      <fieldset>
        <legend>Exportar datos</legend>
        <em>Al pulsar, Espera hasta que salga una notificacion verde.</em>
        <br />
        <br />
        <button id="${button_export_local}" type="button">Exportar sin cifrar</button>
        <button id="${button_export_safe}" type="button">Exportar con cifrado</button>
      </fieldset>
    `;
    document.getElementById(button_export_local).onclick = () => {
      var data_export = {};
      var output = {
        materiales: {},
        personas: {},
      };
      (async () => {
        const materiales = await DB.list('materiales');
        materiales.forEach((entry) => {
          const key = entry.id;
          const value = entry.data;
          if (value != null) {
            if (typeof value == 'string') {
              TS_decrypt(
                value,
                SECRET,
                (data, wasEncrypted) => {
                  output.materiales[key] = data;
                },
                'materiales',
                key
              );
            } else {
              output.materiales[key] = value;
            }
          }
        });
        const personas = await DB.list('personas');
        personas.forEach((entry) => {
          const key = entry.id;
          const value = entry.data;
          if (value != null) {
            if (typeof value == 'string') {
              TS_decrypt(
                value,
                SECRET,
                (data, wasEncrypted) => {
                  output.personas[key] = data;
                },
                'personas',
                key
              );
            } else {
              output.personas[key] = value;
            }
          }
        });
        toastr.success('Exportado todo, descargando!');
        download(`Export %%TITLE%% ${getDBName()}.json.txt`, JSON.stringify(output));
      })();
    };
    document.getElementById(button_export_safe).onclick = () => {
      (async () => {
        const result = { materiales: {}, personas: {} };
        const materiales = await DB.list('materiales');
        materiales.forEach((entry) => {
          result.materiales[entry.id] = entry.data;
        });
        const personas = await DB.list('personas');
        personas.forEach((entry) => {
          result.personas[entry.id] = entry.data;
        });
        toastr.success('Exportado todo, descargado!');
        download(`Export %%TITLE%% Encriptado ${getDBName()}.json.txt`, JSON.stringify(result));
      })();
    };
  },
  __import: function () {
    var select_type = safeuuid();
    var textarea_content = safeuuid();
    var button_import = safeuuid();
    var button_clear = safeuuid();
    container.innerHTML = html`
      <h1>Importar Datos</h1>
      <fieldset>
        <legend>Importar datos</legend>
        <em>Espera hasta que se vacien todas las notificaciones.</em>
        <select id="${select_type}">
          <option value="" disabled selected>Tipo de archivo...</option>
          <option value="comedor">Galileo - db.comedor.axd</option>
          <option value="recetas">Galileo - db.recetas.axd</option>
          <option value="materiales">Galileo - db.materiales.axd</option>
          <option value="personas">Galileo - db.personas.axd</option>
          <option value="comandas">Galileo - db.cafe.comandas.axd</option>
          <option value="%telesec">TeleSec Exportado (encriptado o no)</option>
        </select>
        <textarea
          id="${textarea_content}"
          style="height: 100px;"
          placeholder="Introduce el contenido del archivo"
        ></textarea>
        <button id="${button_import}" type="button">Importar</button>
        <button id="${button_clear}" type="button">Vaciar</button>
      </fieldset>
    `;
    document.getElementById(button_import).onclick = () => {
      toastr.info('Importando datos...');
      var val = document.getElementById(textarea_content).value;
      var sel = document.getElementById(select_type).value;
      if (sel == '%telesec') {
        // legacy import, store entire payload as-is
        // for each top-level key, store their items in DB
        var parsed = JSON.parse(val);
        Object.entries(parsed).forEach((section) => {
          const sectionName = section[0];
          const sectionData = section[1];
          Object.entries(sectionData).forEach((entry) => {
            DB.put(sectionName, entry[0], entry[1]).catch((e) => {
              console.warn('DB.put error', e);
            });
          });
        });
      } else {
        Object.entries(JSON.parse(val)['data']).forEach((entry) => {
          DB.put(sel, entry[0], entry[1]).catch((e) => {
            console.warn('DB.put error', e);
          });
        });
      }
      setTimeout(() => {
        toastr.info('Importado todo!');

        if (sel == '%telesec') {
          setUrlHash('inicio');
        } else {
          setUrlHash(sel);
        }
      }, 5000);
    };
  },
  __labels: function (mid) {
    var div_materiales = safeuuid();
    container.innerHTML = html` <h1>Imprimir Etiquetas QR</h1>
      <button onclick="print()">Imprimir</button>
      <h2>Materiales</h2>
      <div id="${div_materiales}"></div>
      <br /><br />`;
    div_materiales = document.getElementById(div_materiales);
    DB.map('materiales', (data, key) => {
      function add_row(data, key) {
        if (data != null) {
          div_materiales.innerHTML += BuildQR('materiales,' + key, data['Nombre'] || key);
        }
      }
      if (typeof data == 'string') {
        TS_decrypt(data, SECRET, (data) => {
          add_row(data, key);
        });
      } else {
        add_row(data, key);
      }
    });
  },
  __precios: function () {
    var form = safeuuid();
    
    // Cargar precios actuales desde DB
    DB.get('config', 'precios_cafe').then((raw) => {
      TS_decrypt(raw, SECRET, (precios) => {
          container.innerHTML = html`
          <h1>Configuración de Precios del Café</h1>
          <form id="${form}">
            <fieldset>
              <legend>Precios Base (en céntimos)</legend>
              <label>
                <b>Servicio base:</b>
                <input type="number" name="servicio_base" value="${precios.servicio_base || 10}" min="0" step="1" />
                céntimos
              </label>
              <br><br>
              <label>
                <b>Leche pequeña:</b>
                <input type="number" name="leche_pequena" value="${precios.leche_pequena || 15}" min="0" step="1" />
                céntimos
              </label>
              <br><br>
              <label>
                <b>Leche grande:</b>
                <input type="number" name="leche_grande" value="${precios.leche_grande || 25}" min="0" step="1" />
                céntimos
              </label>
              <br><br>
              <label>
                <b>Café:</b>
                <input type="number" name="cafe" value="${precios.cafe || 25}" min="0" step="1" />
                céntimos
              </label>
              <br><br>
              <label>
                <b>ColaCao:</b>
                <input type="number" name="colacao" value="${precios.colacao || 25}" min="0" step="1" />
                céntimos
              </label>
            </fieldset>
            <br>
            <button type="submit">💾 Guardar precios</button>
            <button type="button" onclick="setUrlHash('dataman')">🔙 Volver</button>
          </form>
        `;
        
        document.getElementById(form).onsubmit = (ev) => {
          ev.preventDefault();
          var formData = new FormData(document.getElementById(form));
          var nuevosPrecios = {
            servicio_base: parseInt(formData.get('servicio_base')) || 10,
            leche_pequena: parseInt(formData.get('leche_pequena')) || 15,
            leche_grande: parseInt(formData.get('leche_grande')) || 25,
            cafe: parseInt(formData.get('cafe')) || 25,
            colacao: parseInt(formData.get('colacao')) || 25,
          };
          
          DB.put('config', 'precios_cafe', nuevosPrecios).then(() => {
            toastr.success('Precios guardados correctamente');
            // Actualizar variable global
            if (window.PRECIOS_CAFE) {
              Object.assign(window.PRECIOS_CAFE, nuevosPrecios);
            }
            setTimeout(() => setUrlHash('dataman'), 1000);
          }).catch((e) => {
            toastr.error('Error al guardar precios: ' + e.message);
          });
        };
      });
    }).catch(() => {
      // Si no hay precios guardados, usar valores por defecto
      PAGES.dataman.__precios();
    });
  },
  index: function () {
    container.innerHTML = html`
      <h1>Administración de datos</h1>
      <a class="button" href="#dataman,import">Importar datos</a>
      <a class="button" href="#dataman,export">Exportar datos</a>
      <a class="button" href="#dataman,labels">Imprimir etiquetas</a>
      <a class="button" href="#dataman,precios">⚙️ Precios del café</a>
      <a class="button" href="#dataman,config">Ajustes</a>
    `;
  },
};
