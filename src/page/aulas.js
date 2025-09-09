PERMS["aulas"] = "Aulas (Solo docentes!)";
PAGES.aulas = {
  //navcss: "btn1",
  Title: "Gest-Aula",
  // Make a clone of notas.js and modify it to be aulas.js
  icon: "static/appico/Classroom.svg",
  AccessControl: true,
  index: function () {
    if (!checkRole("aulas")) {
      setUrlHash("index");
      return;
    }
    var data_Comedor = safeuuid();
    var data_Tareas = safeuuid();
    var data_Diario = safeuuid();
    container.innerHTML = `
      <h1>Gestión del Aula - en desarrollo</h1>
      <div>
        <fieldset style="float: left;">
            <legend><img src="${PAGES.notas.icon}" height="20"> Notas esenciales</legend>
            <a class="button" style="font-size: 25px;" href="#notas,inicio_dia">Como iniciar el día</a>
            <a class="button" style="font-size: 25px;" href="#notas,realizacion_cafe">Como realizar el café</a>
            <a class="button" style="font-size: 25px;" href="#notas,fin_dia">Como acabar el día</a>
            <a class="button" style="font-size: 25px;" href="#notas,horario">Horario</a>
            <a class="button" style="font-size: 25px;" href="#notas,tareas">Tareas</a>
        </fieldset>
        <fieldset style="float: left;">
            <legend>Acciones</legend>
            <a class="button" style="font-size: 25px;" href="#aulas,solicitudes"><img src="${PAGES.materiales.icon}" height="20"> Solicitudes de material</a>
            <a class="button" style="font-size: 25px;" href="#aulas,informes,diario-${CurrentISODate()}">Diario de hoy</a>
            <a class="button rojo" style="font-size: 25px;" href="#notas,alertas"><img src="${PAGES.notas.icon}" height="20"> Ver Alertas</a>
            <a class="button" style="font-size: 25px;" href="#aulas,informes"><img src="${PAGES.aulas.icon}" height="20"> Informes y diarios</a>
            <a class="button btn4" style="font-size: 25px;" href="#supercafe"><img src="${PAGES.supercafe.icon}" height="20"> Ver comandas</a>

        </fieldset>
        <fieldset style="float: left;">
            <legend>Datos de hoy</legend>

            <span class="btn7" style="display: inline-block; margin: 5px; padding: 5px; border-radius: 5px; border: 2px solid black; max-width: 25rem;"><b>Menú Comedor:</b> <br><span id="${data_Comedor}">Cargando...</span></span>
            <span class="btn6" style="display: inline-block; margin: 5px; padding: 5px; border-radius: 5px; border: 2px solid black; max-width: 25rem;"><b>Tareas:</b> <br><pre style="overflow-wrap: break-word;white-space:pre-wrap;" id="${data_Tareas}">Cargando...</pre></span>
            <span class="btn5" style="display: inline-block; margin: 5px; padding: 5px; border-radius: 5px; border: 2px solid black; max-width: 25rem;"><b>Diario:</b> <br><pre style="overflow-wrap: break-word;white-space:pre-wrap;" id="${data_Diario}">Cargando...</pre></span>
        </fieldset>
      </div>
      `;

    //#region Cargar Comedor
    gun
      .get(TABLE)
      .get("comedor")
      .get(CurrentISODate())
      .once((data, key) => {
        function add_row(data) {
          // Fix newlines
          data.Platos = data.Platos || "No hay platos registrados para hoy.";
          // Display platos
          document.getElementById(data_Comedor).innerHTML = data.Platos.replace(
            /\n/g,
            "<br>"
          );
        }
        if (typeof data == "string") {
          TS_decrypt(data, SECRET, (data) => {
            add_row(data || {});
          });
        } else {
          add_row(data || {});
        }
      });
    //#endregion Cargar Comedor
    //#region Cargar Tareas
    gun
      .get(TABLE)
      .get("notas")
      .get("tareas")
      .once((data, key) => {
        function add_row(data) {
          // Fix newlines
          data.Contenido = data.Contenido || "No hay tareas.";
          // Display platos
          document.getElementById(data_Tareas).innerHTML = data.Contenido.replace(
            /\n/g,
            "<br>"
          );
        }
        if (typeof data == "string") {
          TS_decrypt(data, SECRET, (data) => {
            add_row(data || {});
          });
        } else {
          add_row(data || {});
        }
      });
    //#endregion Cargar Tareas
    //#region Cargar Diario
    gun
      .get(TABLE)
      .get("aulas_informes")
      .get("diario-" + CurrentISODate())
      .once((data, key) => {
        function add_row(data) {
          // Fix newlines
          data.Contenido = data.Contenido || "No hay un diario.";
          // Display platos
          document.getElementById(data_Diario).innerHTML = data.Contenido.replace(
            /\n/g,
            "<br>"
          );
        }
        if (typeof data == "string") {
          TS_decrypt(data, SECRET, (data) => {
            add_row(data || {});
          });
        } else {
          add_row(data || {});
        }
      });
    //#endregion Cargar Diario
  },
  _solicitudes: function () {
    const tablebody = safeuuid();
    var btn_new = safeuuid();
    container.innerHTML = `
      <a class="button" href="#aulas">← Volver a Gestión de Aulas</a>
      <h1>Solicitudes de Material</h1>
      <button id="${btn_new}">Nueva solicitud</button>
      <div id="cont"></div>
      `;
    TS_IndexElement(
      "aulas,solicitudes",
      [
        {
          key: "Solicitante",
          type: "persona",
          default: "",
          label: "Solicitante",
        },
        {
          key: "Asunto",
          type: "raw",
          default: "",
          label: "Asunto",
        },
      ],
      gun.get(TABLE).get("aulas_solicitudes"),
      document.querySelector("#cont")
    );
    document.getElementById(btn_new).onclick = () => {
      setUrlHash("aulas,solicitudes," + safeuuid(""));
    };
  },
  _solicitudes__edit: function (mid) {
    var nameh1 = safeuuid();
    var field_asunto = safeuuid();
    var field_contenido = safeuuid();
    var field_autor = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    container.innerHTML = `
        <a class="button" href="#aulas,solicitudes">← Volver a solicitudes</a>
        <h1>Solicitud <code id="${nameh1}"></code></h1>
        <fieldset style="float: none; width: calc(100% - 40px);max-width: none;">
            <legend>Valores</legend>
            <div style="max-width: 400px;">
              <label>
                  Asunto<br>
                  <input type="text" id="${field_asunto}" value=""><br><br>
              </label>
              <input type="hidden" id="${field_autor}" readonly value="">
            </div>
            <label>
                Contenido - ¡Incluye el material a solicitar!<br>
                <textarea id="${field_contenido}" style="width: 100%; height: 400px;"></textarea><br><br>
            </label>
            <hr>
            <button class="btn5" id="${btn_guardar}">Guardar</button>
            <button class="rojo" id="${btn_borrar}">Borrar</button>
        </fieldset>
        `;
    gun
      .get(TABLE)
      .get("aulas_solicitudes")
      .get(mid)
      .once((data, key) => {
        function load_data(data, ENC = "") {
          document.getElementById(nameh1).innerText = key;
          document.getElementById(field_asunto).value = data["Asunto"] || "";
          document.getElementById(field_contenido).value =
            data["Contenido"] || "";
          document.getElementById(field_autor).value = data["Solicitante"] || SUB_LOGGED_IN_ID || "";
        }
        if (typeof data == "string") {
          TS_decrypt(data, SECRET, (data) => {
            load_data(data, "%E");
          });
        } else {
          load_data(data || {});
        }
      });
    document.getElementById(btn_guardar).onclick = () => {
      var data = {
        Solicitante: document.getElementById(field_autor).value,
        Contenido: document.getElementById(field_contenido).value,
        Asunto: document.getElementById(field_asunto).value,
      };
      var enc = TS_encrypt(data, SECRET, (encrypted) => {
        document.getElementById("actionStatus").style.display = "block";
        betterGunPut(gun.get(TABLE).get("aulas_solicitudes").get(mid), encrypted);
        toastr.success("Guardado!");
        setTimeout(() => {
          document.getElementById("actionStatus").style.display = "none";
          setUrlHash("aulas,solicitudes");
        }, 1500);
      });
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (confirm("¿Quieres borrar esta solicitud?") == true) {
        betterGunPut(gun.get(TABLE).get("aulas_solicitudes").get(mid), null);
        toastr.error("Borrado!");
        setTimeout(() => {
          setUrlHash("aulas,solicitudes");
        }, 1500);
      }
    };
  },
  _informes: function () {
    const tablebody = safeuuid();
    var btn_new = safeuuid();
    var field_new_byday = safeuuid();
    var btn_new_byday = safeuuid();
    container.innerHTML = `
      <a class="button" href="#aulas">← Volver a Gestión de Aulas</a>
      <h1>Informes</h1>
      <div style="display: inline-block; border: 2px solid black; padding: 5px; border-radius: 5px;">
      <b>Diario:</b><br>
      <input type="date" id="${field_new_byday}" value="${CurrentISODate()}">
      <button id="${btn_new_byday}">Abrir / Nuevo</button>
      </div><br>
      <button id="${btn_new}">Nuevo informe</button>
      <div id="cont"></div>
      `;
    TS_IndexElement(
      "aulas,informes",
      [
        {
          key: "Autor",
          type: "persona",
          default: "",
          label: "Autor",
        },
        {
          key: "Fecha",
          type: "fecha",
          default: "",
          label: "Fecha",
        },
        {
          key: "Asunto",
          type: "raw",
          default: "",
          label: "Asunto",
        },
      ],
      gun.get(TABLE).get("aulas_informes"),
      document.querySelector("#cont")
    );
    document.getElementById(btn_new).onclick = () => {
      setUrlHash("aulas,informes," + safeuuid(""));
    };
    document.getElementById(btn_new_byday).onclick = () => {
      const day = document.getElementById(field_new_byday).value;
      if (day) {
        setUrlHash("aulas,informes,diario-" + day);
      } else {
        toastr.error("Selecciona un día válido");
      }
    }
  },
  _informes__edit: function (mid) {
    var nameh1 = safeuuid();
    var field_asunto = safeuuid();
    var field_contenido = safeuuid();
    var field_autor = safeuuid();
    var field_fecha = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    var title = "";
    if (mid.startsWith("diario-")) {
      var date = mid.replace("diario-", "").split("-");
      title = "Diario " + date[2] + "/" + date[1] + "/" + date[0];
    }
    container.innerHTML = `
        <a class="button" href="#aulas,informes">← Volver a informes</a>
        <h1>Informe <code id="${nameh1}"></code></h1>
        <fieldset style="float: none; width: calc(100% - 40px);max-width: none;">
            <legend>Valores</legend>
            <div style="max-width: 400px;">
              <label>
                  Asunto<br>
                  <input type="text" id="${field_asunto}" value=""><br><br>
              </label>
              <input type="hidden" id="${field_autor}" readonly value="">
              <input type="hidden" id="${field_fecha}" value="">
            </div>
            <label>
                Contenido<br>
                <textarea id="${field_contenido}" style="width: 100%; height: 400px;"></textarea><br><br>
            </label>
            <hr>
            <button class="btn5" id="${btn_guardar}">Guardar</button>
            <button class="rojo" id="${btn_borrar}">Borrar</button>
        </fieldset>
        `;
    gun
      .get(TABLE)
      .get("aulas_informes")
      .get(mid)
      .once((data, key) => {
        function load_data(data, ENC = "") {
          document.getElementById(nameh1).innerText = key;
          document.getElementById(field_asunto).value = data["Asunto"] || title || "";
          document.getElementById(field_contenido).value =
            data["Contenido"] || "";
          document.getElementById(field_autor).value = data["Autor"] || SUB_LOGGED_IN_ID || "";
          document.getElementById(field_fecha).value = data["Fecha"] || mid.startsWith("diario-") ? mid.replace("diario-", "") : CurrentISODate();
        }
        if (typeof data == "string") {
          TS_decrypt(data, SECRET, (data) => {
            load_data(data, "%E");
          });
        } else {
          load_data(data || {});
        }
      });
    document.getElementById(btn_guardar).onclick = () => {
      var data = {
        Autor: document.getElementById(field_autor).value,
        Contenido: document.getElementById(field_contenido).value,
        Asunto: document.getElementById(field_asunto).value,
        Fecha: document.getElementById(field_fecha).value || CurrentISODate(),
      };
      var enc = TS_encrypt(data, SECRET, (encrypted) => {
        document.getElementById("actionStatus").style.display = "block";
        betterGunPut(gun.get(TABLE).get("aulas_informes").get(mid), encrypted);
        toastr.success("Guardado!");
        setTimeout(() => {
          document.getElementById("actionStatus").style.display = "none";
          setUrlHash("aulas,informes");
        }, 1500);
      });
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (confirm("¿Quieres borrar este informe?") == true) {
        betterGunPut(gun.get(TABLE).get("aulas_informes").get(mid), null);
        toastr.error("Borrado!");
        setTimeout(() => {
          setUrlHash("aulas,informes");
        }, 1500);
      }
    };
  },
  edit: function (section) {
    if (!checkRole("aulas")) {
      setUrlHash("index");
      return;
    }
    var item = location.hash.replace("#", "").split(",")[2];
    if (!item) {
      // No item, show section
      switch (section) {
        case "solicitudes":
          this._solicitudes();
          break;
        case "informes":
          this._informes();
          break;
        default:
          this.index();
          break;
      }
    } else {
      // Show section__edit
      switch (section) {
        case "solicitudes":
          this._solicitudes__edit(item);
          break;
        case "informes":
          this._informes__edit(item);
          break;
      }
    }
  },
};
