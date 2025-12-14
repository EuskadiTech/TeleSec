PERMS["personas"] = "Personas";
PERMS["personas:edit"] = "&gt; Editar";
PAGES.personas = {
  navcss: "btn3",
  icon: "static/appico/users.png",
  AccessControl: true,
  Title: "Personas",
  edit: function (mid) {
    if (!checkRole("personas:edit")) {
      setUrlHash("personas");
      return;
    }
    var nameh1 = safeuuid();
    var permisosdet = safeuuid();
    var field_nombre = safeuuid();
    var field_zona = safeuuid();
    var field_notas = safeuuid();
    var field_anilla = safeuuid();
    var field_foto = safeuuid();
    var render_foto = safeuuid();
    var field_monedero_balance = safeuuid();
    var field_monedero_notas = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    var btn_ver_monedero = safeuuid();
    container.innerHTML = `
      <h1>Persona <code id="${nameh1}"></code></h1>
      ${BuildQR("personas," + mid, "Esta Persona")}
      <fieldset>
          <label>
              Nombre<br>
              <input type="text" id="${field_nombre}"><br><br>
          </label>
          <label>
              Zona<br>
              <input type="text" id="${field_zona}"><br><br>
          </label>
          </label>
          <details>
            <summary>Permisos</summary>
            <form id="${permisosdet}">
            </form>
          </details>
          <label>
              Anilla<br>
              <input type="color" id="${field_anilla}"><br><br>
          </label>
          <label>
              Foto (PNG o JPG)<br>
              <img id="${render_foto}" height="100px" style="border: 3px inset; min-width: 7px;" src="static/ico/user_generic.png">
              <input type="file" accept="image/*" id="${field_foto}" style="display: none;"><br><br>
          </label>
          
          <details style="background: #e3f2fd; border: 2px solid #2196f3; border-radius: 8px; padding: 10px; margin: 15px 0;">
            <summary style="cursor: pointer; font-weight: bold; color: #1976d2;">💳 Tarjeta Monedero</summary>
            <div style="padding: 15px;">
              <label>
                  Balance Actual<br>
                  <input type="number" step="0.01" id="${field_monedero_balance}" style="font-size: 24px; font-weight: bold; color: #1976d2;"><br>
                  <small>Se actualiza automáticamente con las transacciones</small><br><br>
              </label>
              <label>
                  Notas del Monedero<br>
                  <textarea id="${field_monedero_notas}" rows="3" placeholder="Notas adicionales sobre el monedero..."></textarea><br><br>
              </label>
              <button type="button" id="${btn_ver_monedero}" class="btn5">Ver Transacciones del Monedero</button>
            </div>
          </details>
          <details style="background: #e3fde3ff; border: 2px solid #21f328ff; border-radius: 8px; padding: 10px; margin: 15px 0;">
            <summary style="cursor: pointer; font-weight: bold; color: rgba(26, 141, 3, 1);">🔗 Generar enlaces</summary>
            <div style="padding: 15px;">
              <label>
                  Este servidor<br>
                  <input type="url" value="${location.protocol}//${location.hostname}:${location.port}${location.pathname}?login=${GROUPID}:${SECRET}&sublogin=${mid}" style="font-size: 10px; font-weight: bold; color: #000;"><br>
              </label>
              <label>
                  Cualquier Servidor<br>
                  <input type="url" value="https://tech.eus/ts/?login=${GROUPID}:${SECRET}&sublogin=${mid}" style="font-size: 10px; font-weight: bold; color: #000;"><br>
              </label>
            </div>
          </details>

          <label>
              Notas<br>
              <textarea id="${field_notas}"></textarea><br><br>
          </label><hr>
          <button class="btn5" id="${btn_guardar}">Guardar</button>
          <button class="rojo" id="${btn_borrar}">Borrar</button>
      </fieldset>
      `;
    var resized = "";
    var pdel = document.getElementById(permisosdet);
    gun
      .get(TABLE)
      .get("personas")
      .get(mid)
      .once((data, key) => {
        function load_data(data, ENC = "") {
          document.getElementById(nameh1).innerText = key;
          var pot = "<ul>";
          Object.entries(PERMS).forEach((page) => {
            var c = "";
            if ((data["Roles"] || ",").split(",").includes(page[0])) {
              c = "checked";
            }
            pot += `
              <li><label>
                <input name="perm" value="${page[0]}" type="checkbox" ${c}>
                ${page[1]}
              </label></li>
            `;
          });
          pdel.innerHTML = pot + "</ul>";
          document.getElementById(field_nombre).value = data["Nombre"] || "";
          document.getElementById(field_zona).value = data["Region"] || "";
          document.getElementById(field_anilla).value = data["SC_Anilla"] || "";
          document.getElementById(render_foto).src =
            data["Foto"] || "static/ico/user_generic.png";
          resized = data["Foto"] || "static/ico/user_generic.png";
          document.getElementById(field_notas).value = data["markdown"] || "";
          document.getElementById(field_monedero_balance).value =
            data["Monedero_Balance"] || 0;
          document.getElementById(field_monedero_notas).value =
            data["Monedero_Notas"] || "";
        }
        if (typeof data == "string") {
          TS_decrypt(data, SECRET, (data) => {
            load_data(data, "%E");
          });
        } else {
          load_data(data || {});
        }
      });
    document
      .getElementById(field_foto)
      .addEventListener("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;

        resizeInputImage(
          file,
          function (url) {
            document.getElementById(render_foto).src = url;
            resized = url;
          },
          256,
          0.7
        );
      });
    document.getElementById(btn_guardar).onclick = () => {
      var dt = new FormData(pdel);
      var data = {
        Nombre: document.getElementById(field_nombre).value,
        Region: document.getElementById(field_zona).value,
        Roles: dt.getAll("perm").join(",") + ",",
        SC_Anilla: document.getElementById(field_anilla).value,
        Foto: resized,
        markdown: document.getElementById(field_notas).value,
        Monedero_Balance:
          parseFloat(document.getElementById(field_monedero_balance).value) ||
          0,
        Monedero_Notas: document.getElementById(field_monedero_notas).value,
      };
      var enc = TS_encrypt(data, SECRET, (encrypted) => {
        document.getElementById("actionStatus").style.display = "block";
        betterGunPut(gun.get(TABLE).get("personas").get(mid), encrypted);
        toastr.success("Guardado!");
        setTimeout(() => {
          document.getElementById("actionStatus").style.display = "none";
          setUrlHash("personas");
        }, SAVE_WAIT);
      });
    };
    document.getElementById(btn_ver_monedero).onclick = () => {
      setUrlHash("pagos"); // Navigate to pagos and show transactions for this person
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (confirm("¿Quieres borrar esta persona?") == true) {
        betterGunPut(gun.get(TABLE).get("personas").get(mid), null);
        toastr.error("Borrado!");
        setTimeout(() => {
          setUrlHash("personas");
        }, SAVE_WAIT);
      }
    };
  },
  index: function () {
    if (!checkRole("personas")) {
      setUrlHash("index");
      return;
    }
    var btn_new = safeuuid();
    container.innerHTML = `
      <h1>Personas</h1>
      <button id="${btn_new}">Nueva Persona</button>
      <div id="tableContainer"></div>
      `;

    const config = [
      {
        label: "Persona",
        type: "persona",
        self: true,
      },
      //{ key: "Roles", label: "Permisos", type: "text", default: "" }
    ];

    TS_IndexElement(
      "personas",
      config,
      gun.get(TABLE).get("personas"),
      document.getElementById("tableContainer"),
      undefined,
      undefined,
      true // Enable global search bar
    );
    if (!checkRole("personas:edit")) {
      document.getElementById(btn_new).style.display = "none";
    } else {
      document.getElementById(btn_new).onclick = () => {
        setUrlHash("personas," + safeuuid(""));
      };
    }
  },
};
