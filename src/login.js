// login.js – TeleSec login page
// New flow: tenant (group) + password → persona selection → JWT stored → replication started

PAGES.login = {
  Esconder: true,
  Title: 'Login',

  // ------------------------------------------------------------------
  // Onboarding: register a new tenant + create first admin persona
  // ------------------------------------------------------------------
  onboarding: function (step) {
    step = step || 'config';

    if (step === 'config') {
      var field_api = safeuuid();
      var field_tenant = safeuuid();
      var field_pass = safeuuid();
      var field_pass2 = safeuuid();
      var btn_register = safeuuid();
      var btn_skip = safeuuid();

      container.innerHTML = html`
        <h1>¡Bienvenido a TeleSec! 🎉</h1>
        <h2>Paso 1: Configurar el servidor</h2>
        <p>Introduce la URL de tu servidor TeleSec y crea un nuevo grupo (tenant).</p>
        <fieldset>
          <label>
            URL del servidor (ej: https://mi-servidor.com)
            <input type="url" id="${field_api}" placeholder="https://mi-servidor.com" value="https://tele.tech.eus" /><br /><br />
          </label>
          <label>
            Nombre del grupo <span style="color:red">*</span>
            <input type="text" id="${field_tenant}" placeholder="mi-grupo" /><br /><br />
          </label>
          <label>
            Contraseña del grupo <span style="color:red">*</span>
            <input type="password" id="${field_pass}" /><br /><br />
          </label>
          <label>
            Repite la contraseña <span style="color:red">*</span>
            <input type="password" id="${field_pass2}" /><br /><br />
          </label>
          <button id="${btn_register}" class="btn5">Registrar grupo y continuar</button>
          <button id="${btn_skip}" class="btn3" style="margin-left:8px;">Ya tengo un grupo</button>
        </fieldset>
      `;

      document.getElementById(btn_skip).onclick = () => {
        var apiUrl = (document.getElementById(field_api).value || '').trim().replace(/\/$/, '');
        localStorage.setItem("TELESEC_API_URL", apiUrl);
        open_page('login');
        setUrlHash('login');
      };

      document.getElementById(btn_register).onclick = async () => {
        var apiUrl = (document.getElementById(field_api).value || '').trim().replace(/\/$/, '');
        var tenant = (document.getElementById(field_tenant).value || '').trim();
        var pass = document.getElementById(field_pass).value;
        var pass2 = document.getElementById(field_pass2).value;

        if (!apiUrl) { toastr.error('Introduce la URL del servidor'); return; }
        if (!tenant) { toastr.error('Introduce el nombre del grupo'); return; }
        if (!pass) { toastr.error('Introduce una contraseña'); return; }
        if (pass !== pass2) { toastr.error('Las contraseñas no coinciden'); return; }
        if (pass.length < 6) { toastr.error('La contraseña debe tener al menos 6 caracteres'); return; }

        var btn = document.getElementById(btn_register);
        btn.disabled = true; btn.innerText = 'Registrando…';

        try {
          var res = await fetch(apiUrl + '/api/auth/register-tenant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: tenant, password: pass }),
          });
          var data = await res.json();
          if (!res.ok) {
            toastr.error(data.error || 'Error al registrar el grupo');
            btn.disabled = false; btn.innerText = 'Registrar grupo y continuar';
            return;
          }
          localStorage.setItem('TELESEC_API_URL', apiUrl);
          toastr.success('Grupo creado. Ahora crea tu primera persona de administrador.');
          open_page('login,onboarding-persona');
          setUrlHash('login,onboarding-persona');
        } catch (e) {
          toastr.error('Error de conexión: ' + (e.message || e));
          btn.disabled = false; btn.innerText = 'Registrar grupo y continuar';
        }
      };
    } else if (step === 'persona') {
      // After tenant creation: login with the new tenant to create the first admin persona
      var field_tenant2 = safeuuid();
      var field_pass3 = safeuuid();
      var field_nombre = safeuuid();
      var btn_crear = safeuuid();

      container.innerHTML = html`
        <h1>¡Bienvenido a TeleSec! 🎉</h1>
        <h2>Paso 2: Crea tu cuenta de administrador</h2>
        <p>Autentícate con el grupo recién creado y añade tu primera persona.</p>
        <fieldset>
          <label>
            Nombre del grupo
            <input type="text" id="${field_tenant2}" /><br /><br />
          </label>
          <label>
            Contraseña del grupo
            <input type="password" id="${field_pass3}" /><br /><br />
          </label>
          <label>
            Tu nombre (administrador)
            <input type="text" id="${field_nombre}" placeholder="Ej: Juan Pérez" /><br /><br />
          </label>
          <button id="${btn_crear}" class="btn5">Crear cuenta y empezar</button>
        </fieldset>
      `;

      document.getElementById(btn_crear).onclick = async () => {
        var apiUrl = (localStorage.getItem('TELESEC_API_URL') || DEFAULT_SERVER).replace(/\/$/, '');
        var tenant = (document.getElementById(field_tenant2).value || '').trim();
        var pass = document.getElementById(field_pass3).value;
        var nombre = (document.getElementById(field_nombre).value || '').trim();

        if (!tenant || !pass) { toastr.error('Introduce el grupo y la contraseña'); return; }
        if (!nombre) { toastr.error('Introduce tu nombre'); return; }

        var btn = document.getElementById(btn_crear);
        btn.disabled = true; btn.innerText = 'Creando…';

        try {
          // Authenticate the tenant
          var loginRes = await fetch(apiUrl + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenant: tenant, password: pass }),
          });
          var loginData = await loginRes.json();
          if (!loginRes.ok) {
            toastr.error(loginData.error || 'Credenciales incorrectas');
            btn.disabled = false; btn.innerText = 'Crear cuenta y empezar';
            return;
          }

          // We need a persona JWT to push to the backend.
          // Create a temporary admin persona via the DB (will be pushed once replication starts)
          var allPerms = Object.keys(PERMS).join(',') + ',';
          var personaId = safeuuid('admin-');
          var persona = {
            Nombre: nombre,
            Roles: allPerms,
            Region: '',
            Monedero_Balance: 0,
            markdown: 'Cuenta de administrador creada durante el onboarding',
          };

          // Push the persona directly to the backend using the tenant token
          var tenantToken = loginData.tenant_token;

          var pushRes = await fetch(apiUrl + '/api/auth/bootstrap-admin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + tenantToken,
            },
            body: JSON.stringify({ persona_id: personaId, Nombre: nombre, Roles: allPerms }),
          });

          if (!pushRes.ok) {
            var pushErr = await pushRes.json().catch(() => ({}));
            toastr.error(pushErr.error || 'Error al crear la persona en el servidor');
            btn.disabled = false; btn.innerText = 'Crear cuenta y empezar';
            return;
          }

          // Now select the persona to get a full JWT
          var selRes = await fetch(apiUrl + '/api/auth/select-persona', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + tenantToken,
            },
            body: JSON.stringify({ persona_id: personaId }),
          });
          var selData = await selRes.json();
          if (!selRes.ok) {
            toastr.error(selData.error || 'Error al seleccionar la persona');
            btn.disabled = false; btn.innerText = 'Crear cuenta y empezar';
            return;
          }

          _applyLogin(selData, persona);
          localStorage.setItem('TELESEC_ONBOARDING_COMPLETE', 'true');
          toastr.success('¡Cuenta de administrador creada! 🎉');
          setTimeout(() => { open_page('index'); setUrlHash('index'); }, 500);
        } catch (e) {
          toastr.error('Error: ' + (e.message || e));
          btn.disabled = false; btn.innerText = 'Crear cuenta y empezar';
        }
      };
    }
  },

  // ------------------------------------------------------------------
  // Server configuration (settings page)
  // ------------------------------------------------------------------
  edit: function (mid) {
    if (mid === 'onboarding-config') { PAGES.login.onboarding('config'); return; }
    if (mid === 'onboarding-persona') { PAGES.login.onboarding('persona'); return; }

    var field_api = safeuuid();
    var btn_save = safeuuid();

    container.innerHTML = html`
      <h1>Configuración del servidor</h1>
      <fieldset>
        <label>
          URL del servidor TeleSec (ej: https://mi-servidor.com)
          <input type="url" id="${field_api}"
            value="${localStorage.getItem('TELESEC_API_URL') || DEFAULT_SERVER}" /><br /><br />
        </label>
        <button id="${btn_save}" class="btn5">Guardar y Conectar</button>
        <button onclick="setUrlHash('login');" class="btn3" style="margin-left:8px;">Cancelar</button>
      </fieldset>
    `;

    document.getElementById(btn_save).onclick = () => {
      var apiUrl = (document.getElementById(field_api).value || '').trim().replace(/\/$/, '');
      if (!apiUrl) { toastr.error('Introduce la URL del servidor'); return; }
      localStorage.setItem('TELESEC_API_URL', apiUrl);
      toastr.success('URL guardada');
      setUrlHash('login');
    };
  },

  // ------------------------------------------------------------------
  // Main login screen
  // ------------------------------------------------------------------
  index: function () {
    var onboardingComplete = localStorage.getItem('TELESEC_ONBOARDING_COMPLETE');

    var step = 'tenant'; // 'tenant' | 'persona'
    var tenantToken = '';
    var personasList = [];

    var div_form = safeuuid();
    var div_personas = safeuuid();

    function renderTenantForm() {
      var field_tenant = safeuuid();
      var field_pass = safeuuid();
      var btn_login = safeuuid();
      var autoLoginDone = false;

      document.getElementById(div_form).innerHTML = html`
        <h2>Iniciar sesión</h2>
        <label>
          Grupo (tenant)
          <input type="text" id="${field_tenant}"
            value="${localStorage.getItem('TELESEC_LAST_TENANT') || ''}"
            autofocus /><br /><br />
        </label>
        <label>
          Contraseña del grupo
          <input type="password" id="${field_pass}"
            value="${localStorage.getItem('TELESEC_LAST_TENANT_PASSWORD') || ''}" /><br /><br />
        </label>
        <button id="${btn_login}" class="btn5">Acceder</button>
        <a class="button btn1" href="#login,setup" style="margin-left:8px;">Configurar servidor</a>
        ${!onboardingComplete
          ? '<a class="button btn2" href="#login,onboarding-config" style="margin-left:8px;">Crear nuevo grupo</a>'
          : ''}
      `;

      async function loginWithTenantCredentials(showValidationError) {
        var tenant = (document.getElementById(field_tenant).value || '').trim();
        var pass = document.getElementById(field_pass).value;
        if (!tenant || !pass) {
          if (showValidationError) toastr.error('Introduce el grupo y la contraseña');
          return;
        }

        localStorage.setItem('TELESEC_LAST_TENANT', tenant);
        localStorage.setItem('TELESEC_LAST_TENANT_PASSWORD', pass);

        var btn = document.getElementById(btn_login);
        btn.disabled = true; btn.innerText = 'Accediendo…';

        try {
          var currentApiUrl = (localStorage.getItem('TELESEC_API_URL') || DEFAULT_SERVER).replace(/\/$/, '');
          if (!currentApiUrl) {
            toastr.error('No hay servidor configurado. Usa "Configurar servidor".');
            btn.disabled = false; btn.innerText = 'Acceder';
            return;
          }
          var res = await fetch(currentApiUrl + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenant: tenant, password: pass }),
          });
          var data = await res.json();
          if (!res.ok) {
            if (showValidationError) toastr.error(data.error || 'Credenciales incorrectas');
            btn.disabled = false; btn.innerText = 'Acceder';
            return;
          }
          tenantToken = data.tenant_token;
          personasList = data.personas || [];

          if (personasList.length === 0) {
            if (showValidationError) toastr.warning('No hay personas en este grupo. Crea una desde la configuración.');
            btn.disabled = false; btn.innerText = 'Acceder';
            return;
          }

          step = 'persona';
          renderPersonaStep(data.tenant_name || tenant);
        } catch (e) {
          if (showValidationError) toastr.error('Error de conexión: ' + (e.message || e));
          btn.disabled = false; btn.innerText = 'Acceder';
        }
      }

      document.getElementById(btn_login).onclick = async () => {
        await loginWithTenantCredentials(true);
      };

      // Allow pressing Enter in password field
      setTimeout(() => {
        var passEl = document.getElementById(field_pass);
        if (passEl) passEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') document.getElementById(btn_login).click();
        });

        // If credentials are already saved, try login automatically.
        if (!autoLoginDone && localStorage.getItem('TELESEC_LAST_TENANT') && localStorage.getItem('TELESEC_LAST_TENANT_PASSWORD')) {
          autoLoginDone = true;
          loginWithTenantCredentials(false);
        }
      }, 50);
    }

    function renderPersonaStep(tenantName) {
      var div_act = safeuuid();
      var field_persona = safeuuid();
      var btn_sel = safeuuid();
      var btn_back = safeuuid();

      document.getElementById(div_form).innerHTML = html`
        <h2>¡Hola, ${tenantName}!</h2>
        <p>Elige tu cuenta:</p>
        <div id="${div_act}"></div>
        <input type="hidden" id="${field_persona}" />
        <button id="${btn_sel}" class="btn5" style="margin-top:10px;">Entrar</button>
        <button id="${btn_back}" class="btn3" style="margin-left:8px;">← Volver</button>
      `;

      var divAct = document.getElementById(div_act);
      addCategory_Personas(
        divAct,
        // Build a temporary SC_Personas-like object from the server list
        personasList.reduce((acc, p) => { acc[p.id] = p; return acc; }, {}),
        '',
        (value) => { document.getElementById(field_persona).value = value; },
        '¿Quién eres?',
        true,
        '— Selecciona tu cuenta —'
      );

      document.getElementById(btn_back).onclick = () => {
        step = 'tenant';
        renderTenantForm();
      };

      document.getElementById(btn_sel).onclick = async () => {
        var personaId = document.getElementById(field_persona).value;
        if (!personaId) { toastr.error('Elige tu cuenta'); return; }

        var btn = document.getElementById(btn_sel);
        btn.disabled = true; btn.innerText = 'Entrando…';

        try {
          var currentApiUrl = (localStorage.getItem('TELESEC_API_URL') || DEFAULT_SERVER).replace(/\/$/, '');
          var res = await fetch(currentApiUrl + '/api/auth/select-persona', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + tenantToken,
            },
            body: JSON.stringify({ persona_id: personaId }),
          });
          var data = await res.json();
          if (!res.ok) {
            toastr.error(data.error || 'Error al seleccionar la persona');
            btn.disabled = false; btn.innerText = 'Entrar';
            return;
          }
          // Find persona details from the list for immediate use
          var personaDetails = personasList.find((p) => p.id === personaId) || { Nombre: personaId };
          _applyLogin(data, personaDetails);
          if (location.hash.replace('#', '').split('?')[0].startsWith('login')) {
            open_page('index');
            setUrlHash('index');
          } else {
            open_page(location.hash.replace('#', '').split('?')[0]);
          }
        } catch (e) {
          toastr.error('Error: ' + (e.message || e));
          btn.disabled = false; btn.innerText = 'Entrar';
        }
      };
    }

    container.innerHTML = html`<div id="${div_form}"></div><div id="${div_personas}"></div>`;
    renderTenantForm();
  },
};

// ------------------------------------------------------------------
// Helper: store JWT + set global session state + kick off replication
// ------------------------------------------------------------------
function _applyLogin(data, personaDetails) {
  localStorage.setItem('TELESEC_JWT', data.access_token);
  if (data.refresh_token) localStorage.setItem('TELESEC_REFRESH_TOKEN', data.refresh_token);
  localStorage.setItem('TELESEC_PERSONA_ID', data.persona_id || '');
  localStorage.setItem('TELESEC_TENANT_ID', data.tenant_id || '');
  localStorage.setItem('TELESEC_TENANT_NAME', data.tenant_name || '');

  SUB_LOGGED_IN_ID = data.persona_id || '';
  SUB_LOGGED_IN_DETAILS = Object.assign(
    { Nombre: data.persona_id, Roles: (data.roles || []).join(',') + ',' },
    personaDetails || {}
  );
  SUB_LOGGED_IN = true;
  SetPages();

  // Initialize SocketIO DB connection with the new token
  if (typeof DB !== 'undefined' && DB.init) {
    try { 
      DB.init({ jwt: data.access_token }).catch(function(e) {
        console.warn('DB init after login:', e.message);
      });
    } catch (e) {}
  }
}

// ------------------------------------------------------------------
// Restore session on page load (if JWT still valid)
// ------------------------------------------------------------------
(function restoreSession() {
  var jwt = localStorage.getItem('TELESEC_JWT');
  var personaId = localStorage.getItem('TELESEC_PERSONA_ID');
  var tenantId = localStorage.getItem('TELESEC_TENANT_ID');
  if (!jwt || !personaId) return;

  // Minimal session restore without a network call (JWT may have expired,
  // but we optimistically restore so the user sees the app; replication
  // will fail with 401 if the token is expired, triggering a forced logout).
  var roles = [];
  try {
    var payload = JSON.parse(atob(jwt.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      // Token expired – clear and force re-login
      localStorage.removeItem('TELESEC_JWT');
      return;
    }
    roles = payload.roles || [];
  } catch (e) {}

  SUB_LOGGED_IN_ID = personaId;
  // SC_Personas will be populated by the DB.map() listener in app_modules.js;
  // use a quick lookup once it becomes available.
  var attempts = 0;
  var timer = setInterval(function () {
    attempts++;
    var details = SC_Personas[personaId];
    if (details) {
      SUB_LOGGED_IN_DETAILS = details;
      clearInterval(timer);
    } else if (attempts > 20) {
      // Fallback after ~5 s
      SUB_LOGGED_IN_DETAILS = {
        Nombre: localStorage.getItem('TELESEC_TENANT_NAME') || personaId,
        Roles: roles.join(',') + ',',
      };
      clearInterval(timer);
    }
  }, 500);

  SUB_LOGGED_IN_DETAILS = {
    Nombre: localStorage.getItem('TELESEC_TENANT_NAME') || personaId,
    Roles: roles.join(',') + ',',
  };
  SUB_LOGGED_IN = true;
  SetPages();
  if (typeof DB !== 'undefined' && DB.init) {
    try { 
      DB.init({ jwt: jwt }).catch(function(e) {
        console.warn('DB init on restore session:', e.message);
      });
    } catch (e) {}
  }
})();
