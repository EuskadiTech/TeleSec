PERMS["notas"] = "Notas"
PERMS["notas:edit"] = "&gt; Editar"
PAGES.notas = {
    navcss: "btn5",
    icon: "static/appico/edit.png",
    AccessControl: true,
    Title: "Notas",
    edit: function (mid) {
      if (!checkRole("notas:edit")) {setUrlHash("notas");return}
      var nameh1 = safeuuid();
      var field_asunto = safeuuid();
      var field_contenido = safeuuid();
      var field_autor = safeuuid();
      var btn_guardar = safeuuid();
      var btn_borrar = safeuuid();
      var div_actions = safeuuid();
      container.innerHTML = `
        <h1>Nota <code id="${nameh1}"></code></h1>
        <fieldset style="float: none; width: calc(100% - 40px);max-width: none;">
            <legend>Valores</legend>
            <div style="max-width: 400px;">
              <label>
                  Asunto<br>
                  <input type="text" id="${field_asunto}" value=""><br><br>
              </label>
              <input type="hidden" id="${field_autor}" value="">
              <div id="${div_actions}"></div>
            </div>
            <label>
                Contenido<br>
                <textarea id="${field_contenido}" style="width: calc(100% - 15px); height: 400px;"></textarea><br><br>
            </label>
            <hr>
            <button class="btn5" id="${btn_guardar}">Guardar</button>
            <button class="rojo" id="${btn_borrar}">Borrar</button>
        </fieldset>
        `;
      var divact = document.getElementById(div_actions);
      addCategory_Personas(
        divact,
        SC_Personas,
        SUB_LOGGED_IN_ID,
        (value) => {
          document.getElementById(field_autor).value = value;
        },
        "Autor"
      );
      gun
        .get(TABLE)
        .get("notas")
        .get(mid)
        .once((data, key) => {
          function load_data(data, ENC = "") {
            document.getElementById(nameh1).innerText = key;
            document.getElementById(field_asunto).value = data["Asunto"] || "";
            document.getElementById(field_contenido).value =
              data["Contenido"] || "";
            document.getElementById(field_autor).value = data["Autor"] || SUB_LOGGED_IN_ID || "";

            // Persona select
            divact.innerHTML = "";
            addCategory_Personas(
              divact,
              SC_Personas,
              data["Autor"] || SUB_LOGGED_IN_ID || "",
              (value) => {
                document.getElementById(field_autor).value = value;
              },
              "Autor"
            );
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
        };
        var enc = TS_encrypt(data, SECRET, (encrypted) => {
          document.getElementById("actionStatus").style.display = "block";
          betterGunPut(
            gun.get(TABLE).get("notas").get(mid),
            encrypted
          );
          toastr.success("Guardado!");
          setTimeout(() => {
            document.getElementById("actionStatus").style.display = "none";
            setUrlHash("notas");
          }, SAVE_WAIT);
        });
      };
      document.getElementById(btn_borrar).onclick = () => {
        if (confirm("¿Quieres borrar esta nota?") == true) {
          betterGunPut(gun.get(TABLE).get("notas").get(mid), null);
          toastr.error("Borrado!");
          setTimeout(() => {
            setUrlHash("notas");
          }, SAVE_WAIT);
        }
      };
    },
    index: function () {
      if (!checkRole("notas")) {setUrlHash("index");return}
      const tablebody = safeuuid();
      var btn_new = safeuuid();
      container.innerHTML = `
                <h1>Notas</h1>
                <button id="${btn_new}">Nueva nota</button>
                <div id="cont"></div>
                `;
      TS_IndexElement(
        "notas",
        [
          {
            key: "Autor",
            type: "persona",
            default: "",
            label: "Autor",
          },
          {
            key: "Asunto",
            type: "raw",
            default: "",
            label: "Asunto",
          },
        ],
        gun.get(TABLE).get("notas"),
        document.querySelector("#cont"),
      );
      if (!checkRole("notas:edit")) {
        document.getElementById(btn_new).style.display = "none"
      } else {
        document.getElementById(btn_new).onclick = () => {
          setUrlHash("notas," + safeuuid(""));
        };
      }
    },
  }