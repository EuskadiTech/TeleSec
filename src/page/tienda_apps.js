PAGES.tienda_apps = {
  Title: 'Tienda de apps',
  icon: 'static/appico/application_enterprise.png',
  SystemApp: true,
  AccessControl: true,
  AccessControlRole: "admin",
  index: function () {
    if (!checkRole('admin')) {
      setUrlHash('index');
      toastr.error('No tienes permiso para acceder a la tienda de apps.');
      return;
    }
    var appsContainerId = safeuuid();
    var externalContainerId = safeuuid();
    var fieldFileId = safeuuid();
    var btnFileInstallId = safeuuid();
    var btnResetId = safeuuid();

    container.innerHTML = html`
      <h1>Tienda de apps</h1>
      <p>Instala o desinstala módulos personalizados para tu cuenta actual.</p>
      <button id="${btnResetId}" class="btn3">Reestablecer apps</button>
      
      <h2>Apps oficiales</h2>
      <div
        id="${appsContainerId}"
        style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;align-items:stretch;"
      ></div>
      <h2>Apps externas instaladas</h2>
      <div
        id="${externalContainerId}"
        style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;align-items:stretch;"
      ></div>
      <fieldset>
        <legend>Instalar app externa</legend>
        <label>
          Archivo .telejs
          <input id="${fieldFileId}" type="file" accept=".telejs,.js,text/javascript" />
        </label>
        <button id="${btnFileInstallId}" class="btn5" type="button">Instalar archivo</button>
        <br />
        <small>⚠️ Solo instala apps de fuentes de confianza.</small>
      </fieldset>
    `;

    var render = () => {
      var catalog = TS_getAppCatalog().filter((app) => app.key !== 'index' && app.key !== 'tienda_apps');
      if (catalog.length === 0) {
        document.getElementById(appsContainerId).innerHTML = '<i>No hay apps disponibles en el catálogo.</i>';
        return;
      }

      var htmlCards = catalog
        .map((app) => {
          var roleInfo = app.requiresRole
            ? app.canAccess
              ? '<small>Permiso: OK</small>'
              : '<small style="color: #b22222;">Sin permiso de acceso</small>'
            : '<small>Permiso: no requerido</small>';

          var actionBtn = app.installed
            ? TS_isMandatoryApp(app.key)
              ? `<button class="btn3" type="button" disabled title="Esta app no se puede desinstalar">Esencial</button>`
              : `<button class="btn3" data-action="uninstall" data-app="${app.key}">Desinstalar</button>`
            : `<button class="btn5" data-action="install" data-app="${app.key}">Instalar</button>`;

          return `
            <fieldset style="margin:0; height: 100%; box-sizing: border-box;">
              <legend>${app.title}</legend>
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <img src="${app.icon}" alt="${app.title}" style="width:32px;height:32px;" />
                <b>${app.title}</b>
                <span>${app.installed ? '✅ Instalada' : '⬜ No instalada'}</span>
              </div>
              <div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                ${actionBtn}
                ${roleInfo}
              </div>
            </fieldset>
          `;
        })
        .join('');

      var target = document.getElementById(appsContainerId);
      target.innerHTML = htmlCards;

      target.querySelectorAll('button[data-action]').forEach((button) => {
        button.onclick = () => {
          var appKey = button.getAttribute('data-app');
          var action = button.getAttribute('data-action');
          if (action === 'install') {
            TS_installApp(appKey);
            toastr.success('App instalada: ' + appKey);
          } else {
            TS_uninstallApp(appKey);
            toastr.info('App desinstalada: ' + appKey);
          }
          SetPages();
          render();
        };
      });

      var external = TS_getExternalAppsCatalog();
      var externalTarget = document.getElementById(externalContainerId);
      if (!external.length) {
        externalTarget.innerHTML = '<i>No hay apps externas instaladas.</i>';
      } else {
        externalTarget.innerHTML = external
          .map((entry) => {
            return `
              <fieldset style="margin:0; height: 100%; box-sizing: border-box;">
                <legend>${entry.title}</legend>
                <div><b>Clave:</b> ${entry.appKey}</div>
                <div><b>Origen:</b> ${entry.sourceType} ${entry.source ? '- ' + entry.source : ''}</div>
                <div style="margin-top:8px;">
                  <button class="btn3" data-external-action="uninstall" data-external-app="${entry.appKey}">
                    Desinstalar externa
                  </button>
                </div>
              </fieldset>
            `;
          })
          .join('');

        externalTarget.querySelectorAll('button[data-external-action]').forEach((button) => {
          button.onclick = async () => {
            var appKey = button.getAttribute('data-external-app');
            await TS_uninstallExternalApp(appKey);
            toastr.info('App externa desinstalada: ' + appKey);
            SetPages();
            render();
          };
        });
      }
    };

    document.getElementById(btnResetId).onclick = async () => {
      await TS_resetAppsToDefault();
      SetPages();
      render();
      toastr.success('Apps reestablecidas al estado por defecto.');
    };

    document.getElementById(btnFileInstallId).onclick = async () => {
      var input = document.getElementById(fieldFileId);
      if (!input.files || !input.files[0]) {
        toastr.error('Selecciona un archivo .telejs');
        return;
      }
      var file = input.files[0];
      try {
        var code = await new Promise((resolve, reject) => {
          var reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target.result || '');
          reader.onerror = (err) => reject(err);
          reader.readAsText(file);
        });
        var entry = await TS_installExternalAppFromCode(code, 'file', file.name || 'archivo.telejs');
        toastr.success('App externa instalada: ' + entry.appKey);
        SetPages();
        render();
      } catch (e) {
        toastr.error('Error instalando archivo: ' + (e && e.message ? e.message : e));
      }
    };

    TS_loadInstalledAppsFromDB().then(() => {
      TS_loadExternalAppsFromDB().then(() => {
        render();
      });
    });
  },
  edit: function () {
    this.index();
  },
};
