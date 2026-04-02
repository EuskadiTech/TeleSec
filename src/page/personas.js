PERMS['personas'] = 'Personas';
PERMS['personas:edit'] = '&gt; Editar';
PAGES.personas = {
  navcss: 'btn3',
  icon: 'static/appico/users.png',
  faicon: 'fas fa-users',
  AccessControl: true,
  Title: 'Personas',
  navItems: [
    { label: 'Ver personas', hash: 'personas', icon: 'fas fa-list' },
    { label: 'Nueva persona', hash: 'personas,$nuevo$', icon: 'fas fa-user-plus' },
  ],
  edit: function (mid) {
    if (!checkRole('personas:edit')) {
      setUrlHash('personas');
      return;
    }
    if (mid === '$nuevo$') {
      mid = safeuuid();
    }
    var nameh1 = safeuuid();
    var permisosdet = safeuuid();
    var field_nombre = safeuuid();
    var field_zona = safeuuid();
    var field_notas = safeuuid();
    var field_anilla = safeuuid();
    var field_foto = safeuuid();
    var field_oculto = safeuuid();
    var render_foto = safeuuid();
    var field_monedero_balance = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    var btn_ver_monedero = safeuuid();
    container.innerHTML = html`
      <h1>Persona <code id="${nameh1}"></code></h1>
      <fieldset style="width: 100%;max-width: 980px;box-sizing: border-box;">
          <div style="display: flex;flex-wrap: wrap;gap: 10px 16px;">
            <label style="display: flex;flex-direction: column;gap: 6px;max-width: 105px;flex: 1 1 105px;">
                Foto
                <img id="${render_foto}" height="100px" style="border: 3px inset; min-width: 7px; width: fit-content;" src="static/ico/user_generic.png">
                <input type="file" accept="image/*" id="${field_foto}" style="display: none;">
            </label>
            <label style="display: flex;flex-direction: column;gap: 6px;min-width: 220px;flex: 1 1 280px;">
                Nombre
                <input type="text" id="${field_nombre}">
            </label>
            <label style="display: flex;flex-direction: column;gap: 6px;min-width: 170px;flex: 1 1 170px;">
                Zona
                <input type="text" id="${field_zona}">
            </label>
            <label style="display: flex;flex-direction: column;gap: 6px;max-width: 170px;flex: 1 1 170px;">
                Saldo Monedero
                <input type="number" step="0.01" id="${field_monedero_balance}" disabled style="color: #000; font-weight: bold;">
            </label>
            <label style="display: flex;flex-direction: column;gap: 6px;max-width: 50px;flex: 1 1 50px;">
                Anilla
                <input type="color" id="${field_anilla}">
            </label>
            <label style="display: flex;flex-direction: column;gap: 6px;max-width: 60px;flex: 1 1 60px;">
                Ocultar?
                <input type="checkbox" id="${field_oculto}" style="height: 50px; width: 50px; margin: 0;">
            </label>
            <label style="display: flex;flex-direction: column;gap: 6px;min-width: 220px;flex: 1 1 100%;">
                Notas
                <textarea id="${field_notas}"></textarea>
            </label>
            <details style="flex: 1 1 100%;">
              <summary>Permisos</summary>
              <form id="${permisosdet}">
              </form>
            </details>
            <details style="background: #e3fde3ff; border: 2px solid #21f328ff; border-radius: 8px; padding: 10px; margin: 15px 0; display: none; flex: 1 1 100%;">
              <summary style="cursor: pointer; font-weight: bold; color: rgba(26, 141, 3, 1);">🔗 Generar enlaces</summary>
              <div style="padding: 15px;display: flex;flex-wrap: wrap;gap: 10px 16px;align-items: flex-end;">
                <label style="display: flex;flex-direction: column;gap: 6px;min-width: 220px;flex: 1 1 100%;">
                    Este servidor
                    <input type="url" value="${location.protocol}//${location.hostname}:${location.port}${location.pathname}?sublogin=${mid}" style="font-size: 10px; font-weight: bold; color: #000;">
                </label>
              </div>
            </details>
          </div>
          <hr>
          <button class="saveico" id="${btn_guardar}">
            <img src="static/floppy_disk_green.png" />
            <br>Guardar
          </button>
          <button class="delico" id="${btn_borrar}">
            <img src="static/garbage.png" />
            <br>Borrar
          </button>
          <button type="button" id="${btn_ver_monedero}" class="opicon">
            <img src="static/cash_flow.png" />
            <br>Movimientos
          </button>
          <button class="opicon" onclick="setUrlHash('personas')" style="float: right;"> <!-- Align to the right -->
            <img src="static/exit.png" />
            <br>Salir
          </button>
          <button class="opicon" onclick="window.print()" style="float: right;"> <!-- Align to the right -->
            <img src="static/printer2.png" />
            <br>Imprimir
          </button>
      </fieldset>
      `;
    var resized = '';
    var pdel = document.getElementById(permisosdet);
    DB.get('personas', mid).then((data) => {
      function load_data(data, ENC = '') {
        document.getElementById(nameh1).innerText = mid;
        var pot = '<ul>';
        Object.entries(PERMS).forEach((page) => {
          var c = '';
          if ((data['Roles'] || ',').split(',').includes(page[0])) {
            c = 'checked';
          }
          pot += `
            <li><label>
              <input name="perm" value="${page[0]}" type="checkbox" ${c}>
              ${page[1]}
            </label></li>
          `;
        });
        pdel.innerHTML = pot + '</ul>';
        document.getElementById(field_nombre).value = data['Nombre'] || '';
        document.getElementById(field_zona).value = data['Region'] || '';
        document.getElementById(field_anilla).value = data['SC_Anilla'] || '';
        document.getElementById(field_oculto).checked = data['Oculto'] || false;
        // set fallback image immediately
        document.getElementById(render_foto).src = data['Foto'] || 'static/ico/user_generic.png';
        resized = data['Foto'] || 'static/ico/user_generic.png';
        // try to load attachment 'foto' if present (preferred storage)
        DB.getAttachment('personas', mid, 'foto')
          .then((durl) => {
            if (durl) {
              document.getElementById(render_foto).src = durl;
              resized = durl;
            }
          })
          .catch(() => {});
        document.getElementById(field_notas).value = data['markdown'] || '';
        document.getElementById(field_monedero_balance).value = data['Monedero_Balance'] || 0;
      }
      if (typeof data == 'string') {
        TS_decrypt(
          data,
          SECRET,
          (data, wasEncrypted) => {
            load_data(data, '%E');
          },
          'personas',
          mid
        );
      } else {
        load_data(data || {});
      }
    });
    document.getElementById(field_foto).addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;
      // resize images with resizeInputImage.
      const reader = new FileReader();
      reader.onload = function (ev) {
        const url = ev.target.result;
        resizeInputImage(file, (resizedDataUrl) => {
          document.getElementById(render_foto).src = resizedDataUrl;
          resized = resizedDataUrl;
        });
        // show original immediately while resizing in background (resized image will replace it once ready)
        document.getElementById(render_foto).src = url;
        resized = url;
      };
      reader.readAsDataURL(file);
    });
    document.getElementById(btn_guardar).onclick = () => {
      // Disable button to prevent double-clicking
      var guardarBtn = document.getElementById(btn_guardar);
      if (guardarBtn.disabled) return;

      guardarBtn.disabled = true;
      guardarBtn.style.opacity = '0.5';

      var dt = new FormData(pdel);
      var data = {
        Nombre: document.getElementById(field_nombre).value,
        Region: document.getElementById(field_zona).value,
        Roles: dt.getAll('perm').join(',') + ',',
        SC_Anilla: document.getElementById(field_anilla).value,
        Oculto: document.getElementById(field_oculto).checked,
        // Foto moved to PouchDB attachment named 'foto'
        markdown: document.getElementById(field_notas).value,
        Monedero_Balance: parseFloat(document.getElementById(field_monedero_balance).value) || 0,
      };
      document.getElementById('actionStatus').style.display = 'block';
      DB.put('personas', mid, data)
        .then(() => {
          // if resized is a data URL (new/updated image), save as attachment
          var attachPromise = Promise.resolve(true);
          if (typeof resized === 'string' && resized.indexOf('data:') === 0) {
            attachPromise = DB.putAttachment('personas', mid, 'foto', resized, 'image/png');
          }
          attachPromise
            .then(() => {
              toastr.success('Guardado!');
              setTimeout(() => {
                document.getElementById('actionStatus').style.display = 'none';
                setUrlHash('personas');
              }, SAVE_WAIT);
            })
            .catch((e) => {
              console.warn('putAttachment error', e);
              document.getElementById('actionStatus').style.display = 'none';
              guardarBtn.disabled = false;
              guardarBtn.style.opacity = '1';
              toastr.error('Error al guardar la foto');
            });
        })
        .catch((e) => {
          console.warn('DB.put error', e);
          document.getElementById('actionStatus').style.display = 'none';
          guardarBtn.disabled = false;
          guardarBtn.style.opacity = '1';
          toastr.error('Error al guardar la persona');
        });
    };
    document.getElementById(btn_ver_monedero).onclick = () => {
      setUrlHash('pagos?filter=Persona:' + encodeURIComponent(mid)); // Navigate to pagos and show transactions for this person
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (confirm('¿Quieres borrar esta persona?') == true) {
        DB.del('personas', mid).then(() => {
          toastr.error('Borrado!');
          setTimeout(() => {
            setUrlHash('personas');
          }, SAVE_WAIT);
        });
      }
    };
  },
  index: function () {
    if (!checkRole('personas')) {
      setUrlHash('index');
      return;
    }
    var btn_new = safeuuid();
    container.innerHTML = html`
      <h1>Personas</h1>
      <button id="${btn_new}">Nueva Persona</button>
      <div id="tableContainer"></div>
    `;

    const config = [
      // {
      //   label: "Persona",
      //   type: "persona",
      //   self: true,
      // },
      { key: 'Foto', label: 'Foto', type: 'attachment-persona', default: '', self: true },
      { key: 'Nombre', label: 'Nombre', type: 'text', default: '' },
      { key: 'Region', label: 'Zona', type: 'text', default: '' },
      { key: 'Monedero_Balance', label: 'Saldo Monedero', type: 'moneda' },
      //{ key: "markdown", label: "Notas", type: "markdown", default: "" },
      //{ key: "Roles", label: "Permisos", type: "text", default: "" }
    ];

    TS_IndexElement(
      'personas',
      config,
      'personas',
      document.getElementById('tableContainer'),
      undefined,
      undefined,
      true // Enable global search bar
    );
    if (!checkRole('personas:edit')) {
      document.getElementById(btn_new).style.display = 'none';
    } else {
      document.getElementById(btn_new).onclick = () => {
        setUrlHash('personas,' + safeuuid(''));
      };
    }
  },
};
