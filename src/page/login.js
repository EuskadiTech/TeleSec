PAGES.login = {
    Esconder: true,
    Title: "Login",
    edit: function (mid) {
      // Setup form to configure CouchDB remote and initial group/secret
      var field_couch = safeuuid();
      var field_couch_dbname = safeuuid();
      var field_couch_user = safeuuid();
      var field_couch_pass = safeuuid();
      var field_secret = safeuuid();
        var btn_import_json = safeuuid();
        var div_import_area = safeuuid();
        var field_json = safeuuid();
        var field_file = safeuuid();
        var btn_parse_json = safeuuid();
        var btn_start_scan = safeuuid();
        var div_scan = safeuuid();
      var btn_save = safeuuid();
      container.innerHTML = `
        <h1>Configuración del servidor CouchDB</h1>
        <b>Aviso: Después de guardar, la aplicación intentará sincronizar con el servidor CouchDB en segundo plano. Puede que falten registros hasta que se termine. Tenga paciencia.</b>
        <fieldset>
          <label>Servidor CouchDB (ej: couch.example.com)
            <input type="text" id="${field_couch}" value="${(localStorage.getItem('TELESEC_COUCH_URL') || '').replace(/^https?:\/\//, '')}"><br><br>
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
          <label>Clave de encriptación (opcional) - usada para cifrar datos en reposo
            <input type="password" id="${field_secret}" value="${localStorage.getItem('TELESEC_SECRET') || ''}"><br><br>
          </label>
            <div style="margin-top:8px;">
              <button id="${btn_import_json}" class="btn4">Importar desde JSON / QR</button>
            </div>
            <div id="${div_import_area}" style="display:none;margin-top:10px;border:1px solid #eee;padding:8px;">
              <label>Pegar JSON de configuración (o usar archivo / QR):</label><br>
              <textarea id="${field_json}" style="width:100%;height:120px;margin-top:6px;" placeholder='{"server":"couch.example.com","dbname":"telesec-test","username":"user","password":"pass","secret":"SECRET123"}'></textarea>
              <div style="margin-top:6px;">
                <input type="file" id="${field_file}" accept="application/json"> 
                <button id="${btn_parse_json}" class="btn5">Aplicar JSON</button>
                <button id="${btn_start_scan}" class="btn3">Escanear QR (si disponible)</button>
              </div>
              <div id="${div_scan}" style="margin-top:8px;"></div>
            </div>
          <button id="${btn_save}" class="btn5">Guardar y Conectar</button>
        </fieldset>
        <p>Después de guardar, el navegador intentará sincronizar en segundo plano con el servidor.</p>
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
            localStorage.setItem('TELESEC_COUCH_URL', 'https://' + url.replace(/^https?:\/\//, ''));
            if (dbname) localStorage.setItem('TELESEC_COUCH_DBNAME', dbname);
            if (user) localStorage.setItem('TELESEC_COUCH_USER', user);
            if (pass) localStorage.setItem('TELESEC_COUCH_PASS', pass);
            if (secret) {
              localStorage.setItem('TELESEC_SECRET', secret.toUpperCase());
              SECRET = secret.toUpperCase();
            }
            DB.init({ secret: SECRET, remoteServer: 'https://' + url.replace(/^https?:\/\//, ''), username: user, password: pass, dbname: dbname || undefined });
            toastr.success('Configuración aplicada e iniciando sincronización');
            location.hash = '#login';
            setTimeout(function(){ location.reload(); }, 400);
          } catch (e) {
            toastr.error('Error aplicando configuración: ' + (e && e.message ? e.message : e));
          }
        }

        // Toggle import area
        document.getElementById(btn_import_json).onclick = function () {
          var el = document.getElementById(div_import_area);
          el.style.display = (el.style.display === 'none') ? 'block' : 'none';
        };

        // Parse textarea JSON
        document.getElementById(btn_parse_json).onclick = function () {
          var txt = document.getElementById(field_json).value.trim();
          if (!txt) { toastr.error('JSON vacío'); return; }
          try {
            var obj = JSON.parse(txt);
            applyConfig(obj);
          } catch (e) {
            toastr.error('JSON inválido: ' + e.message);
          }
        };

        // File input: read JSON file and apply
        document.getElementById(field_file).addEventListener('change', function (ev) {
          var f = ev.target.files && ev.target.files[0];
          if (!f) return;
          var r = new FileReader();
          r.onload = function (e) {
            try {
              var txt = e.target.result;
              document.getElementById(field_json).value = txt;
              var obj = JSON.parse(txt);
              applyConfig(obj);
            } catch (err) {
              toastr.error('Error leyendo archivo JSON: ' + (err && err.message ? err.message : err));
            }
          };
          r.readAsText(f);
        });

        // QR scanning (if html5-qrcode available)
        document.getElementById(btn_start_scan).onclick = function () {
          var scanDiv = document.getElementById(div_scan);
          scanDiv.innerHTML = '';
          if (window.Html5QrcodeScanner || window.Html5Qrcode) {
            try {
              var targetId = div_scan + '-cam';
              scanDiv.innerHTML = '<div id="' + targetId + '"></div><div style="margin-top:6px;"><button id="' + targetId + '-stop" class="btn3">Detener</button></div>';
              var html5Qr;
              if (window.Html5Qrcode) {
                html5Qr = new Html5Qrcode(targetId);
                Html5Qrcode.getCameras().then(function(cameras){
                  var camId = (cameras && cameras[0] && cameras[0].id) ? cameras[0].id : undefined;
                  html5Qr.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, function(decodedText){
                    try {
                      var obj = JSON.parse(decodedText);
                      html5Qr.stop();
                      applyConfig(obj);
                    } catch (e) {
                      toastr.error('QR no contiene JSON válido');
                    }
                  }, function(err){ /* ignore scan errors */ }).catch(function(err){ toastr.error('Error iniciando cámara: ' + err); });
                }).catch(function(){
                  // fallback: start without camera list
                  html5Qr.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, function(decodedText){
                    try { applyConfig(JSON.parse(decodedText)); } catch(e){ toastr.error('QR no contiene JSON válido'); }
                  }, function(){}).catch(function(err){
                    toastr.error('Error iniciando cámara: ' + (err && err.message ? err.message : err));
                  });
                });
              } else {
                // Html5QrcodeScanner fallback
                var scanner = new Html5QrcodeScanner(targetId, { fps: 10, qrbox: 250 });
                scanner.render(function(decodedText){
                  try { applyConfig(JSON.parse(decodedText)); scanner.clear(); } catch(e){ toastr.error('QR no contiene JSON válido'); }
                });
              }
              // stop button
              document.getElementById(targetId + '-stop').onclick = function () {
                if (html5Qr && html5Qr.getState && html5Qr.getState() === Html5Qrcode.ScanStatus.SCANNING) {
                  html5Qr.stop().catch(function(){});
                }
                scanDiv.innerHTML = '';
              };
            } catch (e) {
              toastr.error('Error al iniciar escáner: ' + (e && e.message ? e.message : e));
            }
          } else {
            scanDiv.innerHTML = '<p>Escáner no disponible. Copia/pega el JSON o sube un archivo.</p>';
          }
        };
      document.getElementById(btn_save).onclick = () => {
        var url = document.getElementById(field_couch).value.trim();
        var dbname = document.getElementById(field_couch_dbname).value.trim();
        var user = document.getElementById(field_couch_user).value.trim();
        var pass = document.getElementById(field_couch_pass).value;
        var secret = document.getElementById(field_secret).value || '';
        localStorage.setItem('TELESEC_COUCH_URL', "https://" + url);
        localStorage.setItem('TELESEC_COUCH_DBNAME', dbname);
        localStorage.setItem('TELESEC_COUCH_USER', user);
        localStorage.setItem('TELESEC_COUCH_PASS', pass);
        localStorage.setItem('TELESEC_SECRET', secret.toUpperCase());
        SECRET = secret.toUpperCase();
        try {
          DB.init({ secret: SECRET, remoteServer: "https://" + url, username: user, password: pass, dbname: dbname || undefined });
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