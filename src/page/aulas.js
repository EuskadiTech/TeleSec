PERMS["aulas"] = "Aulas";
PERMS["aulas:edit"] = "&gt; Editar";
PAGES.aulas = {
  //navcss: "btn1",
  Title: "Aulas",
  // Make a clone of notas.js and modify it to be aulas.js
  icon: "static/appico/Classroom.svg",
  AccessControl: true,
  edit: function (mid) {
    if (!checkRole("aulas:edit")) {
      setUrlHash("aulas");
      return;
    }
    var nameh1 = safeuuid();
    var field_nombre = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    var data_Comedor = safeuuid();
    container.innerHTML = `
      <h1>Aula <code id="${nameh1}"></code></h1>
      <div>
        <fieldset style="float: left;">
            <legend>Datos</legend>
            <label for="${field_nombre}">Nombre:</label>
            <input type="text" id="${field_nombre}" />
            <br><br>
              <button class="btn5" id="${btn_guardar}">Guardar</button>
              <button class="rojo" id="${btn_borrar}">Borrar</button>
        </fieldset>
        <fieldset style="float: left;">
            <legend>Notas</legend>
            <a class="button btn5" style="font-size: 25px;" href="#notas,inicio_dia">Iniciar el dia</a>
            <a class="button" style="font-size: 25px;" href="#notas,horario">Horario</a>
            <a class="button" style="font-size: 25px;" href="#notas,realizacion_cafe">Realización del café</a>
            <a class="button" style="font-size: 25px;" href="#notas,fin_dia">Acabar el dia</a>
            <a class="button rojo" style="font-size: 25px;" href="#notas,alertas">Alertas para hoy</a>
        </fieldset>
        <fieldset style="float: left;">
            <legend>Datos de hoy</legend>

            <span class="btn7" style="display: inline-block; margin: 5px; padding: 5px; border-radius: 5px; border: 2px solid black;"><b>Comedor</b>: <span id="${data_Comedor}">Cargando...</span></span>
        </fieldset>
      </div>
      `;
    gun
      .get(TABLE)
      .get("aulas")
      .get(mid)
      .once((data, key) => {
        function load_data(data, ENC = "") {
          document.getElementById(nameh1).innerText = key;
          document.getElementById(field_nombre).value = data["Nombre"] || "";
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
      var data = {
        Nombre: document.getElementById(field_nombre).value,
      };
      var enc = SEA.encrypt(data, SECRET, (encrypted) => {
        document.getElementById("actionStatus").style.display = "block";
        betterGunPut(gun.get(TABLE).get("aulas").get(mid), encrypted);
        toastr.success("Guardado!");
        setTimeout(() => {
          document.getElementById("actionStatus").style.display = "none";
          setUrlHash("aulas");
        }, 1500);
      });
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (confirm("¿Quieres borrar este aula?") == true) {
        betterGunPut(gun.get(TABLE).get("aulas").get(mid), null);
        toastr.error("Borrado!");
        setTimeout(() => {
          setUrlHash("aulas");
        }, 1500);
      }
    };

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
          document.getElementById(data_Comedor).innerHTML =
            data.Platos.replace(/\n/g, "<br>");
        }
        if (typeof data == "string") {
          SEA.decrypt(data, SECRET, (data) => {
            add_row(data || {});
          });
        } else {
          add_row(data || {});
        }
      });
    //#endregion Cargar Comedor
  },
  index: function () {
    if (!checkRole("aulas")) {
      setUrlHash("index");
      return;
    }
    const tablebody = safeuuid();
    var btn_new = safeuuid();
    container.innerHTML = `
      <h1>Aulas - en desarrollo</h1>
      <button id="${btn_new}">Nuevo aula</button>
      <div id="cont"></div>
      `;
    TS_IndexElement(
      "aulas",
      [
        {
          key: "Nombre",
          type: "raw",
          default: "",
          label: "Nombre",
        },
      ],
      gun.get(TABLE).get("aulas"),
      document.querySelector("#cont")
    );
    if (!checkRole("aulas:edit")) {
      document.getElementById(btn_new).style.display = "none";
    } else {
      document.getElementById(btn_new).onclick = () => {
        setUrlHash("aulas," + safeuuid(""));
      };
    }
  },
};
