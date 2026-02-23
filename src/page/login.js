function makeCouchURLDisplay(host, user, pass, dbname) {
  if (!host) return '';
  var display = user + ':' + pass + '@' + host.replace(/^https?:\/\//, '') + '/' + dbname;
  return display;
}
PAGES.login = {
  Esconder: true,
  Title: 'Login',
  onboarding: function (step) {
    // Multi-step onboarding flow
    step = step || 'config';

    if (step === 'config') {
      // Step 1: "Configuración de datos"
      var field_couch = safeuuid();
      var field_secret = safeuuid();
      var btn_existing_server = safeuuid();
      var btn_new_server = safeuuid();
      var btn_skip = safeuuid();
      var div_server_config = safeuuid();

      container.innerHTML = html`
        <h1>¡Bienvenido a TeleSec! 🎉</h1>
        <h2>Paso 1: Configuración de datos</h2>
        <p>Para comenzar, elige cómo quieres configurar tu base de datos:</p>
        <fieldset>
          <button id="${btn_existing_server}" class="btn5">Conectar a CouchDB existente</button>
          <button id="${btn_new_server}" class="btn2">Solicitar un nuevo CouchDB</button>
          <button id="${btn_skip}" class="btn3">No sincronizar (no recomendado)</button>
        </fieldset>
        <div id="${div_server_config}" style="display:none;margin-top:20px;">
          <h3>Configuración del servidor CouchDB</h3>
          <fieldset>
            <label
              >Origen CouchDB (ej: usuario:contraseña@servidor/basededatos)
              <input
                type="text"
                id="${field_couch}"
                value="${makeCouchURLDisplay(
                  localStorage.getItem('TELESEC_COUCH_URL'),
                  localStorage.getItem('TELESEC_COUCH_USER'),
                  localStorage.getItem('TELESEC_COUCH_PASS'),
                  localStorage.getItem('TELESEC_COUCH_DBNAME')
                )}"
              /><br /><br />
            </label>
            <label
              >Clave de encriptación <span style="color: red;">*</span>
              <input
                type="password"
                id="${field_secret}"
                value="${localStorage.getItem('TELESEC_SECRET') || ''}"
                required
              /><br /><br />
            </label>
            <button id="${btn_skip}-save" class="btn5">Guardar y Continuar</button>
          </fieldset>
        </div>
      `;

      document.getElementById(btn_existing_server).onclick = () => {
        document.getElementById(div_server_config).style.display = 'block';
      };

      document.getElementById(btn_new_server).onclick = () => {
        window.open('https://tech.eus/telesec-signup.php', '_blank');
        toastr.info(
          'Una vez creado el servidor, vuelve aquí y conéctate usando el botón "Conectar a un servidor existente"'
        );
      };

      document.getElementById(btn_skip).onclick = () => {
        // Continue to persona creation without server config
        // Check if personas already exist (shouldn't happen but safety check)
        var hasPersonas = Object.keys(SC_Personas).length > 0;
        if (hasPersonas) {
          toastr.info('Ya existen personas. Saltando creación de cuenta.');
          localStorage.setItem('TELESEC_ONBOARDING_COMPLETE', 'true');
          open_page('login');
          setUrlHash('login');
        } else {
          open_page('login,onboarding-persona');
          setUrlHash('login,onboarding-persona');
        }
      };

      document.getElementById(btn_skip + '-save').onclick = () => {
        var url = document.getElementById(field_couch).value.trim();
        var secret = document.getElementById(field_secret).value.trim();

        if (!url) {
          toastr.error('Por favor ingresa un servidor CouchDB');
          return;
        }

        if (!secret) {
          toastr.error('La clave de encriptación es obligatoria');
          return;
        }

        // Normalize URL: add https:// if no protocol specified
        var normalizedUrl = url;
        if (!/^https?:\/\//i.test(url)) {
          normalizedUrl = 'https://' + url;
        }
        var URL_PARSED = parseURL(normalizedUrl);
        var user = URL_PARSED.username || '';
        var pass = URL_PARSED.password || '';
        var dbname = URL_PARSED.pathname ? URL_PARSED.pathname.replace(/^\//, '') : '';
        var host = URL_PARSED.hostname || normalizedUrl;
        localStorage.setItem('TELESEC_COUCH_URL', 'https://' + host);
        localStorage.setItem('TELESEC_COUCH_DBNAME', dbname);
        localStorage.setItem('TELESEC_COUCH_USER', user);
        localStorage.setItem('TELESEC_COUCH_PASS', pass);
        localStorage.setItem('TELESEC_SECRET', secret.toUpperCase());
        SECRET = secret.toUpperCase();

        try {
          DB.init({
            secret: SECRET,
            remoteServer: 'https://' + host,
            username: user,
            password: pass,
            dbname: dbname || undefined,
          });
          toastr.success('Servidor configurado correctamente');
          document.getElementById('loading').style.display = 'block';
          function waitForReplicationIdle(maxWaitMs, idleMs) {
            var startTime = Date.now();
            var lastSeenSync = window.TELESEC_LAST_SYNC || 0;
            return new Promise((resolve) => {
              var interval = setInterval(() => {
                var now = Date.now();
                var currentSync = window.TELESEC_LAST_SYNC || 0;
                if (currentSync > lastSeenSync) {
                  lastSeenSync = currentSync;
                }
                var lastActivity = Math.max(lastSeenSync, startTime);
                var idleLongEnough = now - lastActivity >= idleMs;
                var timedOut = now - startTime >= maxWaitMs;
                if (idleLongEnough || timedOut) {
                  clearInterval(interval);
                  resolve();
                }
              }, 250);
            });
          }

          // Wait until replication goes idle or timeout
          waitForReplicationIdle(10000, 2500).then(() => {
            // Check if personas were replicated from server
            var hasPersonas = Object.keys(SC_Personas).length > 0;
            document.getElementById('loading').style.display = 'none';
            if (hasPersonas) {
              // Personas found from server, skip persona creation step
              toastr.info('Se encontraron personas en el servidor. Saltando creación de cuenta.');
              localStorage.setItem('TELESEC_ONBOARDING_COMPLETE', 'true');
              open_page('login');
              setUrlHash('login');
            } else {
              // No personas found, continue to persona creation
              open_page('login,onboarding-persona');
              setUrlHash('login,onboarding-persona');
            }
          });
        } catch (e) {
          document.getElementById('loading').style.display = 'none';
          toastr.error('Error al configurar el servidor: ' + (e.message || e));
        }
      };
    } else if (step === 'persona') {
      // Step 2: "Crea una persona"
      var field_nombre = safeuuid();
      var btn_crear = safeuuid();

      // Check if personas already exist
      var hasPersonas = Object.keys(SC_Personas).length > 0;
      if (hasPersonas) {
        toastr.info('Se detectaron personas existentes. Redirigiendo al login.');
        localStorage.setItem('TELESEC_ONBOARDING_COMPLETE', 'true');
        open_page('login');
        setUrlHash('login');
        return;
      }

      container.innerHTML = html`
        <h1>¡Bienvenido a TeleSec! 🎉</h1>
        <h2>Paso 2: Crea tu cuenta de administrador</h2>
        <p>Para continuar, necesitas crear una cuenta personal con permisos de administrador.</p>
        <fieldset>
          <label
            >Tu nombre:
            <input
              type="text"
              id="${field_nombre}"
              placeholder="Ej: Juan Pérez"
              autofocus
            /><br /><br />
          </label>
          <p>
            <small
              >ℹ️ Esta cuenta tendrá todos los permisos de administrador y podrás gestionar la
              aplicación completamente.</small
            >
          </p>
          <button id="${btn_crear}" class="btn5">Crear cuenta y empezar</button>
        </fieldset>
      `;

      document.getElementById(btn_crear).onclick = () => {
        var nombre = document.getElementById(field_nombre).value.trim();
        if (!nombre) {
          toastr.error('Por favor ingresa tu nombre');
          return;
        }

        // Disable button to prevent duplicate creation
        var btnElement = document.getElementById(btn_crear);
        btnElement.disabled = true;
        btnElement.style.opacity = '0.5';
        btnElement.innerText = 'Creando...';

        // Create persona with all admin permissions from PERMS object
        var allPerms = Object.keys(PERMS).join(',') + ',';
        var personaId = safeuuid('admin-');
        var persona = {
          Nombre: nombre,
          Roles: allPerms,
          Region: '',
          Monedero_Balance: 0,
          markdown: 'Cuenta de administrador creada durante el onboarding',
        };

        DB.put('personas', personaId, persona)
          .then(() => {
            toastr.success('¡Cuenta creada exitosamente! 🎉');
            localStorage.setItem('TELESEC_ONBOARDING_COMPLETE', 'true');
            localStorage.setItem('TELESEC_ADMIN_ID', personaId);

            // Auto-login
            SUB_LOGGED_IN_ID = personaId;
            SUB_LOGGED_IN_DETAILS = persona;
            SUB_LOGGED_IN = true;
            SetPages();

            setTimeout(() => {
              open_page('index');
              setUrlHash('index');
            }, 500);
          })
          .catch((e) => {
            toastr.error('Error creando cuenta: ' + (e.message || e));
            // Re-enable button on error
            btnElement.disabled = false;
            btnElement.style.opacity = '1';
            btnElement.innerText = 'Crear cuenta y empezar';
          });
      };
    }
  },
  edit: function (mid) {
    // Handle onboarding routes
    if (mid === 'onboarding-config') {
      PAGES.login.onboarding('config');
      return;
    }
    if (mid === 'onboarding-persona') {
      PAGES.login.onboarding('persona');
      return;
    }
    // Setup form to configure CouchDB remote and initial group/secret
    var field_couch = safeuuid();
    var field_secret = safeuuid();
    var btn_save = safeuuid();
    container.innerHTML = html`
      <h1>Configuración del servidor CouchDB</h1>
      <b
        >Aviso: Después de guardar, la aplicación intentará sincronizar con el servidor CouchDB en
        segundo plano. Puede que falten registros hasta que se termine. Tenga paciencia.</b
      >
      <fieldset>
        <label
          >Origen CouchDB (ej: usuario:contraseña@servidor/basededatos)
          <input
            type="text"
            id="${field_couch}"
            value="${makeCouchURLDisplay(
              localStorage.getItem('TELESEC_COUCH_URL'),
              localStorage.getItem('TELESEC_COUCH_USER'),
              localStorage.getItem('TELESEC_COUCH_PASS'),
              localStorage.getItem('TELESEC_COUCH_DBNAME')
            )}"
          /><br /><br />
        </label>
        <label
          >Clave de encriptación (opcional) - usada para cifrar datos en reposo
          <input
            type="password"
            id="${field_secret}"
            value="${localStorage.getItem('TELESEC_SECRET') || ''}"
          /><br /><br />
        </label>
        <button id="${btn_save}" class="btn5">Guardar y Conectar</button>
        <button onclick="setUrlHash('login');" class="btn3">Cancelar</button>
      </fieldset>
      <p>
        Después de guardar, el navegador intentará sincronizar en segundo plano con el servidor.
      </p>
    `;
    // Helper: normalize and apply config object
    function applyConfig(cfg) {
      try {
        if (!cfg) throw new Error('JSON vacío');
        var url = cfg.server || cfg.couch || cfg.url || cfg.host || cfg.hostname || cfg.server_url;
        var dbname = cfg.dbname || cfg.database || cfg.db || cfg.name;
        var user = cfg.username || cfg.user || cfg.u;
        var pass = cfg.password || cfg.pass || cfg.p;
        var secret = (cfg.secret || cfg.key || cfg.secretKey || cfg.SECRET || '').toString();
        if (!url) throw new Error('Falta campo "server" en JSON');
        var URL_PARSED = parseURL(url);
        var host = URL_PARSED.hostname || url;
        localStorage.setItem('TELESEC_COUCH_URL', 'https://' + host);
        if (dbname) localStorage.setItem('TELESEC_COUCH_DBNAME', dbname);
        if (user) localStorage.setItem('TELESEC_COUCH_USER', user);
        if (pass) localStorage.setItem('TELESEC_COUCH_PASS', pass);
        if (secret) {
          localStorage.setItem('TELESEC_SECRET', secret.toUpperCase());
          SECRET = secret.toUpperCase();
        }
        DB.init({
          secret: SECRET,
          remoteServer: 'https://' + url.replace(/^https?:\/\//, ''),
          username: user,
          password: pass,
          dbname: dbname || undefined,
        });
        toastr.success('Configuración aplicada e iniciando sincronización');
        location.hash = '#login';
        setTimeout(function () {
          location.reload();
        }, 400);
      } catch (e) {
        toastr.error('Error aplicando configuración: ' + (e && e.message ? e.message : e));
      }
    }
    document.getElementById(btn_save).onclick = () => {
      var url = document.getElementById(field_couch).value.trim();
      var secret = document.getElementById(field_secret).value.trim();
      var URL_PARSED = parseURL(url);
      var host = URL_PARSED.hostname || url;
      var user = URL_PARSED.username || '';
      var pass = URL_PARSED.password || '';
      var dbname = URL_PARSED.pathname ? URL_PARSED.pathname.replace(/^\//, '') : '';
      localStorage.setItem('TELESEC_COUCH_URL', 'https://' + host);
      localStorage.setItem('TELESEC_COUCH_DBNAME', dbname);
      localStorage.setItem('TELESEC_COUCH_USER', user);
      localStorage.setItem('TELESEC_COUCH_PASS', pass);
      localStorage.setItem('TELESEC_SECRET', secret.toUpperCase());
      SECRET = secret.toUpperCase();
      try {
        DB.init({
          secret: SECRET,
          remoteServer: 'https://' + host,
          username: user,
          password: pass,
          dbname: dbname || undefined,
        });
        toastr.success('Iniciando sincronización con CouchDB');
        location.hash = '#login';
        //location.reload();
      } catch (e) {
        toastr.error('Error al iniciar sincronización: ' + e.message);
      }
    };
  },
  index: function (mid) {
    // Check if onboarding is needed
    var onboardingComplete = localStorage.getItem('TELESEC_ONBOARDING_COMPLETE');
    var hasPersonas = Object.keys(SC_Personas).length > 0;

    // If no personas exist and onboarding not complete, redirect to onboarding
    if (!hasPersonas && !onboardingComplete && !AC_BYPASS) {
      open_page('login,onboarding-config');
      setUrlHash('login,onboarding-config');
      return;
    }

    var field_persona = safeuuid();
    var btn_guardar = safeuuid();
    var btn_reload = safeuuid();
    var div_actions = safeuuid();
    container.innerHTML = html`
      <h1>Iniciar sesión</h1>
      <fieldset>
        <legend>Valores</legend>
        <input type="hidden" id="${field_persona}" />
        <div id="${div_actions}"></div>
        <button class="btn5" id="${btn_guardar}">Acceder</button>
        <button class="btn3" id="${btn_reload}">Recargar lista</button>
        <a class="button btn1" href="#login,setup">Configurar base de datos</a>
      </fieldset>
    `;
    var divact = document.getElementById(div_actions);
    addCategory_Personas(
      divact,
      SC_Personas,
      '',
      (value) => {
        document.getElementById(field_persona).value = value;
      },
      '¿Quién eres?',
      true,
      "- Pulsa recargar o rellena los credenciales abajo, si quieres crear un nuevo grupo, pulsa el boton 'Desde cero' -"
    );
    document.getElementById(btn_guardar).onclick = () => {
      if (document.getElementById(field_persona).value == '') {
        alert('Tienes que elegir tu cuenta!');
        return;
      }
      SUB_LOGGED_IN_ID = document.getElementById(field_persona).value;
      SUB_LOGGED_IN_DETAILS = SC_Personas[SUB_LOGGED_IN_ID];
      SUB_LOGGED_IN = true;
      SetPages();
      if (location.hash.replace('#', '').split("?")[0].startsWith('login')) {
        open_page('index');
        setUrlHash('index');
      } else {
        open_page(location.hash.replace('#', '').split("?")[0]);
      }
    };

    document.getElementById(btn_reload).onclick = () => {
      open_page('login');
    };

    // AC_BYPASS: allow creating a local persona from the login screen
    if (AC_BYPASS) {
      var btn_bypass_create = safeuuid();
      divact.innerHTML += `<button id="${btn_bypass_create}" class="btn2" style="margin-left:10px;">Crear persona local (bypass)</button>`;
      document.getElementById(btn_bypass_create).onclick = () => {
        var name = prompt('Nombre de la persona (ej: Admin):');
        if (!name) return;
        var id = 'bypass-' + Date.now();
        var persona = { Nombre: name, Roles: 'ADMIN,' };
        DB.put('personas', id, persona)
          .then(() => {
            toastr.success('Persona creada: ' + id);
            localStorage.setItem('TELESEC_BYPASS_ID', id);
            SUB_LOGGED_IN_ID = id;
            SUB_LOGGED_IN_DETAILS = persona;
            SUB_LOGGED_IN = true;
            SetPages();
            open_page('index');
          })
          .catch((e) => {
            toastr.error('Error creando persona: ' + (e && e.message ? e.message : e));
          });
      };
    }
  },
};
