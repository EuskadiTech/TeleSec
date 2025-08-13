PAGES.avisos = {
    navcss: "btn5",
    icon: "static/appico/Alert_Warning.svg",
    AccessControl: true,
    Title: "Avisos",
    edit: function (mid) {
      var nameh1 = safeuuid();
      var field_fecha = safeuuid();
      var field_asunto = safeuuid();
      var field_origen = safeuuid();
      var field_destino = safeuuid();
      var field_estado = safeuuid();
      var field_mensaje = safeuuid();
      var field_respuesta = safeuuid();
      var btn_leer = safeuuid();
      var btn_desleer = safeuuid();
      var btn_guardar = safeuuid();
      var btn_borrar = safeuuid();
      var div_actions = safeuuid();
      container.innerHTML = `
                <h1>Aviso <code id="${nameh1}"></code></h1>
                <fieldset style="float: left;">
                    <legend>Valores</legend>
                    <label>
                        Fecha<br>
                        <input readonly disabled type="text" id="${field_fecha}" value="${CurrentISODate()}"><br><br>
                    </label>
                    <label>
                        Asunto<br>
                        <input type="text" id="${field_asunto}" value=""><br><br>
                    </label>
                    <input type="hidden" id="${field_origen}">
                    <input type="hidden" id="${field_destino}">
                    <div id="${div_actions}"></div>
                    <label>
                        Mensaje<br>
                        <textarea id="${field_mensaje}"></textarea><br><br>
                    </label>
                    <label>
                        Respuesta<br>
                        <textarea id="${field_respuesta}"></textarea><br><br>
                    </label>
                    <label>
                        Estado<br>
                        <input readonly disabled type="text" id="${field_estado}" value="%%">
                        <br>
                        <button id="${btn_leer}">Leido</button>
                        <button id="${btn_desleer}">No leido</button>
                        <br>
                    </label><hr>
                    <button class="btn5" id="${btn_guardar}">Guardar</button>
                    <button class="rojo" id="${btn_borrar}">Borrar</button>
                </fieldset>
                `;
      document.getElementById(btn_leer).onclick = () => {
        document.getElementById(field_estado).value = "leido";
      };
      document.getElementById(btn_desleer).onclick = () => {
        document.getElementById(field_estado).value = "por_leer";
      };
      var divact = document.getElementById(div_actions);
      addCategory_Personas(
        divact,
        SC_Personas,
        "",
        (value) => {
          document.getElementById(field_origen).value = value;
        },
        "Origen"
      );
      addCategory_Personas(
        divact,
        SC_Personas,
        "",
        (value) => {
          document.getElementById(field_destino).value = value;
        },
        "Destino"
      );
      gun
        .get(TABLE)
        .get("notificaciones")
        .get(mid)
        .once((data, key) => {
          function load_data(data, ENC = "") {
            document.getElementById(nameh1).innerText = key;
            document.getElementById(field_fecha).value = data["Fecha"];
            document.getElementById(field_asunto).value = data["Asunto"] || "";
            document.getElementById(field_mensaje).value =
              data["Mensaje"] || "";
            document.getElementById(field_origen).value = data["Origen"] || "";
            document.getElementById(field_destino).value =
              data["Destino"] || "";
            document.getElementById(field_estado).value = data["Estado"] || "";
            document.getElementById(field_respuesta).value =
              data["Respuesta"] || "";

            // Persona select
            divact.innerHTML = "";
            addCategory_Personas(
              divact,
              SC_Personas,
              data["Origen"] || "",
              (value) => {
                document.getElementById(field_origen).value = value;
              },
              "Origen"
            );
            addCategory_Personas(
              divact,
              SC_Personas,
              data["Destino"] || "",
              (value) => {
                document.getElementById(field_destino).value = value;
              },
              "Destino"
            );
          }
          if (typeof data == "string") {
            SEA.decrypt(data, SECRET, (data) => {
              load_data(data, "%E");
            });
          } else {
            load_data(data);
          }
        });
      document.getElementById(btn_guardar).onclick = () => {
        if (document.getElementById(field_origen).value == "") {
          alert("¡Hay que elegir una persona de origen!");
          return;
        }
        if (document.getElementById(field_destino).value == "") {
          alert("¡Hay que elegir una persona de origen!");
          return;
        }
        var data = {
          Fecha: document.getElementById(field_fecha).value,
          Origen: document.getElementById(field_origen).value,
          Destino: document.getElementById(field_destino).value,
          Mensaje: document.getElementById(field_mensaje).value,
          Respuesta: document.getElementById(field_respuesta).value,
          Asunto: document.getElementById(field_asunto).value,
          Estado: document
            .getElementById(field_estado)
            .value.replace("%%", "por_leer"),
        };
        var enc = SEA.encrypt(data, SECRET, (encrypted) => {
          document.getElementById("actionStatus").style.display = "block";
          betterGunPut(
            gun.get(TABLE).get("notificaciones").get(mid),
            encrypted
          );
          toastr.success("Guardado!");
          setTimeout(() => {
            document.getElementById("actionStatus").style.display = "none";
            setUrlHash("notificaciones");
          }, 1500);
        });
      };
      document.getElementById(btn_borrar).onclick = () => {
        if (confirm("¿Quieres borrar esta notificación?") == true) {
          betterGunPut(gun.get(TABLE).get("notificaciones").get(mid), null);
          toastr.error("Borrado!");
          setTimeout(() => {
            setUrlHash("notificaciones");
          }, 1500);
        }
      };
    },
    index: function () {
      const tablebody = safeuuid();
      var btn_new = safeuuid();
      container.innerHTML = `
                <h1>Avisos</h1>
                <button id="${btn_new}">Nuevo aviso</button>
                <div id="cont"></div>
                `;
      TS_IndexElement(
        "avisos",
        [
          {
            key: "Origen",
            type: "persona",
            default: "",
            label: "Origen",
          },
          {
            key: "Destino",
            type: "persona",
            default: "",
            label: "Destino",
          },
          {
            key: "Asunto",
            type: "raw",
            default: "",
            label: "Asunto",
          },
          {
            key: "Estado",
            type: "raw",
            default: "",
            label: "Estado",
          },
        ],
        gun.get(TABLE).get("notificaciones"),
        document.querySelector("#cont"),
        (data, new_tr) => {
          new_tr.style.backgroundColor = "#FFCCCB";
          if (data.Estado == "leido") {
            new_tr.style.backgroundColor = "lightgreen";
          }
        }
      );
      document.getElementById(btn_new).onclick = () => {
        setUrlHash("notificaciones," + safeuuid(""));
      };
    },
  }