PERMS['comedor'] = 'Comedor';
PERMS['comedor:edit'] = '&gt; Editar';
PAGES.comedor = {
  navcss: 'btn6',
  icon: 'static/appico/apple.png',
  AccessControl: true,
  Title: 'Comedor',
  __cleanupOldMenus: async function () {
    try {
      var rows = await DB.list('comedor');
      var now = new Date();
      var todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      var removed = 0;

      function parseISODateToUTC(value) {
        if (!value || typeof value !== 'string') return null;
        var match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;
        var y = parseInt(match[1], 10);
        var m = parseInt(match[2], 10) - 1;
        var d = parseInt(match[3], 10);
        return Date.UTC(y, m, d);
      }

      async function getFechaFromRow(row) {
        var data = row.data;
        if (typeof data === 'string') {
          return await new Promise((resolve) => {
            TS_decrypt(
              data,
              SECRET,
              (decrypted) => {
                if (decrypted && typeof decrypted === 'object') {
                  resolve(decrypted.Fecha || row.id.split(',')[0] || '');
                } else {
                  resolve(row.id.split(',')[0] || '');
                }
              },
              'comedor',
              row.id
            );
          });
        }
        if (data && typeof data === 'object') {
          return data.Fecha || row.id.split(',')[0] || '';
        }
        return row.id.split(',')[0] || '';
      }

      for (const row of rows) {
        var fecha = await getFechaFromRow(row);
        var rowUTC = parseISODateToUTC(fecha);
        if (rowUTC == null) continue;
        var ageDays = Math.floor((todayUTC - rowUTC) / 86400000);
        if (ageDays >= 30) {
          await DB.del('comedor', row.id);
          removed += 1;
        }
      }

      if (removed > 0) {
        toastr.info('Limpieza automática: ' + removed + ' menús antiguos eliminados.');
      }
    } catch (e) {
      console.warn('Comedor cleanup error', e);
    }
  },
  edit: function (mid) {
    if (!checkRole('comedor:edit')) {
      setUrlHash('comedor');
      return;
    }
    var nameh1 = safeuuid();
    var field_fecha = safeuuid();
    var field_tipo = safeuuid();
    var field_primero = safeuuid();
    var field_segundo = safeuuid();
    var field_postre = safeuuid();
    var btn_picto_primero = safeuuid();
    var btn_picto_segundo = safeuuid();
    var btn_picto_postre = safeuuid();
    var debounce_picto = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    container.innerHTML = html`
      <h1>Entrada del menú <code id="${nameh1}"></code></h1>
      <fieldset style="float: left;">
        <legend>Valores</legend>
        <label>
          Fecha<br />
          <input type="date" id="${field_fecha}" value="" /><br /><br />
        </label>
        <label>
          Tipo<br />
          <input type="text" id="${field_tipo}" value="" /><br /><br />
        </label>
        <label>
          Primero<br />
          <input type="text" id="${field_primero}" value="" /><br />
          <div class="picto" id="${btn_picto_primero}"></div>
        </label>
        <label>
          Segundo<br />
          <input type="text" id="${field_segundo}" value="" /><br />
          <div class="picto" id="${btn_picto_segundo}"></div>
        </label>
        <label>
          Postre<br />
          <input type="text" id="${field_postre}" value="" /><br />
          <div class="picto" id="${btn_picto_postre}"></div>
        </label>
        <button class="btn5" id="${btn_guardar}">Guardar</button>
        <button class="rojo" id="${btn_borrar}">Borrar</button>
      </fieldset>
    `;
    const pictogramSelector = TS_CreateArasaacSelector({
      modal: true,
      debounceId: debounce_picto,
      onPick: (context, item) => {
        TS_applyPictoValue(context.pictoId, {
          text: item.label,
          arasaacId: String(item.id),
        });
      },
    });
    document.getElementById(btn_picto_primero).onclick = () =>
      pictogramSelector.open({ pictoId: btn_picto_primero });
    document.getElementById(btn_picto_segundo).onclick = () =>
      pictogramSelector.open({ pictoId: btn_picto_segundo });
    document.getElementById(btn_picto_postre).onclick = () =>
      pictogramSelector.open({ pictoId: btn_picto_postre });
    DB.get('comedor', mid).then((data) => {
      function load_data(data, ENC = '') {
        document.getElementById(nameh1).innerText = mid;
        document.getElementById(field_fecha).value = data['Fecha'] || mid || CurrentISODate();
        document.getElementById(field_tipo).value = data['Tipo'] || '';
        document.getElementById(field_primero).value = data['Primero'] || '';
        document.getElementById(field_segundo).value = data['Segundo'] || '';
        document.getElementById(field_postre).value = data['Postre'] || '';
        TS_applyPictoValue(btn_picto_primero, data['Primero_Picto'] || '');
        TS_applyPictoValue(btn_picto_segundo, data['Segundo_Picto'] || '');
        TS_applyPictoValue(btn_picto_postre, data['Postre_Picto'] || '');
      }
      if (typeof data == 'string') {
        TS_decrypt(
          data,
          SECRET,
          (data, wasEncrypted) => {
            load_data(data, '%E');
          },
          'comedor',
          mid
        );
      } else {
        load_data(data || {});
      }
    });
    document.getElementById(btn_guardar).onclick = () => {
      // Disable button to prevent double-clicking
      var guardarBtn = document.getElementById(btn_guardar);
      if (guardarBtn.disabled) return;

      guardarBtn.disabled = true;
      guardarBtn.style.opacity = '0.5';

      const newDate = document.getElementById(field_fecha).value;
      const newTipo = document.getElementById(field_tipo).value.trim();
      var data = {
        Fecha: newDate,
        Tipo: newTipo,
        Primero: document.getElementById(field_primero).value.trim(),
        Segundo: document.getElementById(field_segundo).value.trim(),
        Postre: document.getElementById(field_postre).value.trim(),
        Primero_Picto: TS_getPictoValue(btn_picto_primero),
        Segundo_Picto: TS_getPictoValue(btn_picto_segundo),
        Postre_Picto: TS_getPictoValue(btn_picto_postre),
      };

      // If the date has changed, we need to delete the old entry
      if (mid !== newDate + "," + newTipo && mid !== '') {
        DB.del('comedor', mid);
      }

      document.getElementById('actionStatus').style.display = 'block';
      DB.put('comedor', newDate + "," + newTipo, data)
        .then(() => {
          toastr.success('Guardado!');
          setTimeout(() => {
            document.getElementById('actionStatus').style.display = 'none';
            setUrlHash('comedor');
          }, SAVE_WAIT);
        })
        .catch((e) => {
          console.warn('DB.put error', e);
          guardarBtn.disabled = false;
          guardarBtn.style.opacity = '1';
          document.getElementById('actionStatus').style.display = 'none';
          toastr.error('Error al guardar el menú');
        });
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (confirm('¿Quieres borrar esta entrada?') == true) {
        DB.del('comedor', mid).then(() => {
          toastr.error('Borrado!');
          setTimeout(() => {
            setUrlHash('comedor');
          }, SAVE_WAIT);
        });
      }
    };
  },
  index: function () {
    if (!checkRole('comedor')) {
      setUrlHash('index');
      return;
    }
    const cont = safeuuid();
    var btn_new = safeuuid();
    container.innerHTML = html`
      <h1>Menú del comedor</h1>
      <button id="${btn_new}">Nueva entrada</button>
      <div id="${cont}"></div>
    `;
    var renderList = () => {
      TS_IndexElement(
        'comedor',
        [
          {
            key: 'Fecha',
            type: 'raw',
            default: '',
            label: 'Fecha',
          },
          {
            key: 'Tipo',
            type: 'raw',
            default: '',
            label: 'Tipo',
          },
          {
            key: 'Primero_Picto',
            type: 'picto',
            default: '',
            label: 'Primero',
            labelkey: 'Primero',
          },
          {
            key: 'Segundo_Picto',
            type: 'picto',
            default: '',
            label: 'Segundo',
            labelkey: 'Segundo',
          },
          {
            key: 'Postre_Picto',
            type: 'picto',
            default: '',
            label: 'Postre',
            labelkey: 'Postre',
          },
        ],
        'comedor',
        document.getElementById(cont),
        (data, new_tr) => {
          // new_tr.style.backgroundColor = "#FFCCCB";
          if (data.Fecha == CurrentISODate()) {
            new_tr.style.backgroundColor = 'lightgreen';
          }
        }
      );
    };

    PAGES.comedor.__cleanupOldMenus().finally(renderList);

    if (!checkRole('comedor:edit')) {
      document.getElementById(btn_new).style.display = 'none';
    } else {
      document.getElementById(btn_new).onclick = () => {
        setUrlHash('comedor,' + safeuuid(''));
      };
    }
  },
};
