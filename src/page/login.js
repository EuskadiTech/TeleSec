PAGES.login = {
    Esconder: true,
    Title: "Login",
    edit: function (mid) {
      // Setup form to configure CouchDB remote and initial group/secret
      var field_couch = safeuuid();
      var field_couch_dbname = safeuuid();
      var field_couch_user = safeuuid();
      var field_couch_pass = safeuuid();
      var btn_save = safeuuid();
      container.innerHTML = `
        <h1>Configuración del servidor CouchDB</h1>
        <fieldset>
          <label>Servidor CouchDB (ej: https://couch.example.com)
            <input type="text" id="${field_couch}" value="${localStorage.getItem('TELESEC_COUCH_URL') || ''}"><br><br>
          </label>
          <label>Nombre de la base (opcional, por defecto usa telesec-<grupo>)
            <input type="text" id="${field_couch_dbname}" value="${localStorage.getItem('TELESEC_COUCH_DBNAME') || ''}"><br><br>
          </label>
          <label>Usuario
            <input type="text" id="${field_couch_user}" value="${localStorage.getItem('TELESEC_COUCH_USER') || ''}"><br><br>
          </label>
          <label>Contraseña
            <input type="password" id="${field_couch_pass}" value="${localStorage.getItem('TELESEC_COUCH_PASS') || ''}"><br><br>
          </label>
          <button id="${btn_save}" class="btn5">Guardar y Conectar</button>
        </fieldset>
        <p>Después de guardar, el navegador intentará sincronizar en segundo plano con el servidor.</p>
      `;
      document.getElementById(btn_save).onclick = () => {
        var url = document.getElementById(field_couch).value.trim();
        var dbname = document.getElementById(field_couch_dbname).value.trim();
        var user = document.getElementById(field_couch_user).value.trim();
        var pass = document.getElementById(field_couch_pass).value;
        localStorage.setItem('TELESEC_COUCH_URL', url);
        localStorage.setItem('TELESEC_COUCH_DBNAME', dbname);
        localStorage.setItem('TELESEC_COUCH_USER', user);
        localStorage.setItem('TELESEC_COUCH_PASS', pass);
        try {
          DB.init({ secret: SECRET, remoteServer: url, username: user, password: pass, dbname: dbname || undefined });
          toastr.success('Iniciando sincronización con CouchDB');
          location.hash = "#login";
          location.reload();
        } catch (e) {
          toastr.error('Error al iniciar sincronización: ' + e.message);
        }
      };
    },
    index: function (mid) {
      var field_persona = safeuuid();
      var btn_guardar = safeuuid();
      var btn_reload = safeuuid();
      var div_actions = safeuuid();
      container.innerHTML = `
        <h1>Iniciar sesión</h1>
        <fieldset>
            <legend>Valores</legend>
            <input type="hidden" id="${field_persona}">
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
        "",
        (value) => {
          document.getElementById(field_persona).value = value;
        },
        "¿Quién eres?",
        true,
        "- Pulsa recargar o rellena los credenciales abajo, si quieres crear un nuevo grupo, pulsa el boton 'Desde cero' -"
      );
      document.getElementById(btn_guardar).onclick = () => {
        if (document.getElementById(field_persona).value == "") {
          alert("Tienes que elegir tu cuenta!");
          return;
        }
        SUB_LOGGED_IN_ID = document.getElementById(field_persona).value
        SUB_LOGGED_IN_DETAILS = SC_Personas[SUB_LOGGED_IN_ID]
        SUB_LOGGED_IN = true
        SetPages()
        if (location.hash.replace("#", "").startsWith("login")) {
          open_page("index");
          setUrlHash("index")
        } else{
          open_page(location.hash.replace("#", ""));
        }
      };
      
      document.getElementById(btn_reload).onclick = () => {
        open_page("login")
      };

      // AC_BYPASS: allow creating a local persona from the login screen
      if (AC_BYPASS) {
        var btn_bypass_create = safeuuid();
        divact.innerHTML += `<button id="${btn_bypass_create}" class="btn2" style="margin-left:10px;">Crear persona local (bypass)</button>`;
        document.getElementById(btn_bypass_create).onclick = () => {
          var name = prompt("Nombre de la persona (ej: Admin):");
          if (!name) return;
            var id = 'bypass-' + Date.now();
            var persona = { Nombre: name, Roles: 'ADMIN,' };
            DB.put('personas', id, persona).then(() => {
              toastr.success('Persona creada: ' + id);
              localStorage.setItem('TELESEC_BYPASS_ID', id);
              SUB_LOGGED_IN_ID = id;
              SUB_LOGGED_IN_DETAILS = persona;
              SUB_LOGGED_IN = true;
              SetPages();
              open_page('index');
            }).catch((e) => {
              toastr.error('Error creando persona: ' + (e && e.message ? e.message : e));
            });
        };
      }
    }
  }