PERMS["materiales"] = "Materiales"
PERMS["materiales:edit"] = "&gt; Editar"
PAGES.materiales = {
  navcss: "btn2",
  icon: "static/appico/App_Dropbox.svg",
  AccessControl: true,
  Title: "Materiales",
  edit: function (mid) {
    if (!checkRole("materiales:edit")) {setUrlHash("materiales");return}
    var nameh1 = safeuuid();
    var field_nombre = safeuuid();
    var field_cantidad = safeuuid();
    var field_unidad = safeuuid();
    var field_cantidad_min = safeuuid();
    var field_abierto = safeuuid();
    var field_ubicacion = safeuuid();
    var field_referencia = safeuuid();
    var field_notas = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    container.innerHTML = `
                <h1>Material <code id="${nameh1}"></code></h1>
                ${BuildQR("materiales," + mid, "Este Material")}
                <fieldset>
                    <label>
                        Referencia<br>
                        <input type="text" id="${field_referencia}" value="?"><br><br>
                    </label>
                    <label>
                        Nombre<br>
                        <input type="text" id="${field_nombre}"><br><br>
                    </label>
                    <label>
                        Unidad<br>
                        <input type="text" id="${field_unidad}"><br><br>
                    </label>
                    <label>
                        Cantidad Actual<br>
                        <input type="number" step="0.5" id="${field_cantidad}"><br><br>
                    </label>
                    <label>
                        Cantidad Minima<br>
                        <input type="number" step="0.5" id="${field_cantidad_min}"><br><br>
                    </label>
                    <label>
                        Ubicación<br>
                        <input type="text" id="${field_ubicacion}" value="-"><br><br>
                    </label>
                    <label>
                        Notas<br>
                        <textarea id="${field_notas}"></textarea><br><br>
                    </label><hr>
                    <button class="btn5" id="${btn_guardar}">Guardar</button>
                    <button class="rojo" id="${btn_borrar}">Borrar</button>
                </fieldset>
                `;
    gun
      .get(TABLE)
      .get("materiales")
      .get(mid)
      .once((data, key) => {
        function load_data(data, ENC = "") {
          document.getElementById(nameh1).innerText = key;
          document.getElementById(field_nombre).value = data["Nombre"] || "";
          document.getElementById(field_unidad).value = data["Unidad"] || "";
          document.getElementById(field_cantidad).value =
            data["Cantidad"] || "";
          document.getElementById(field_cantidad_min).value =
            data["Cantidad_Minima"] || "";
          document.getElementById(field_ubicacion).value =
            data["Ubicacion"] || "-";
          document.getElementById(field_referencia).value =
            data["Referencia"] || "?";
          document.getElementById(field_notas).value = data["Notas"] || "";
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
        Nombre: document.getElementById(field_nombre).value,
        Unidad: document.getElementById(field_unidad).value,
        Cantidad: document.getElementById(field_cantidad).value,
        Cantidad_Minima: document.getElementById(field_cantidad_min).value,
        Ubicacion: document.getElementById(field_ubicacion).value,
        Referencia: document.getElementById(field_referencia).value,
        Notas: document.getElementById(field_notas).value,
      };
      var enc = TS_encrypt(data, SECRET, (encrypted) => {
        document.getElementById("actionStatus").style.display = "block";
        betterGunPut(gun.get(TABLE).get("materiales").get(mid), encrypted);
        toastr.success("Guardado!");
        setTimeout(() => {
          document.getElementById("actionStatus").style.display = "none";
          setUrlHash("materiales");
        }, 1500);
      });
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (confirm("¿Quieres borrar este material?") == true) {
        betterGunPut(gun.get(TABLE).get("materiales").get(mid), null);
        toastr.error("Borrado!");
        setTimeout(() => {
          setUrlHash("materiales");
        }, 1500);
      }
    };
  },
  index: function () {
    if (!checkRole("materiales")) {setUrlHash("index");return}
    var btn_new = safeuuid();
    var select_ubicacion = safeuuid();
    container.innerHTML = `
      <h1>Materiales</h1>
      <label>Filtrar por ubicación:
        <select id="${select_ubicacion}">
          <option value="">(Todas)</option>
        </select>
      </label>
      <button id="${btn_new}">Nuevo Material</button>
      <div id="tableContainer"></div>
    `;

    const config = [
      { key: "Referencia", label: "Referencia", type: "text", default: "?" },
      { key: "Nombre", label: "Nombre", type: "text", default: "?" },
      { key: "Ubicacion", label: "Ubicación", type: "text", default: "?" },
      { 
        key: "Cantidad", 
        label: "Cantidad", 
        type: "template",
        template: (data, element) => {
          const min = parseFloat(data.Cantidad_Minima);
          const act = parseFloat(data.Cantidad);
          const style = act < min ? 'style="background-color: lightcoral;"' : '';
          element.setAttribute("style", style);
          element.innerHTML = `${data.Cantidad || "?"} ${data.Unidad || "?"} - (min. ${data.Cantidad_Minima || "?"})`;
        },
        default: "?" 
      },
      { key: "Notas", label: "Notas", type: "text", default: "?" }
    ];

    // Obtener todas las ubicaciones únicas y poblar el <select>, desencriptando si es necesario
    gun.get(TABLE).get("materiales").once().map().once((data, key) => {
      try {
        if (!data) return;
        function addUbicacion(d) {
          let ubicacion = d.Ubicacion || "-";
          let select = document.getElementById(select_ubicacion);
          if ([...select.options].some(opt => opt.value === ubicacion)) return;
          let option = document.createElement("option");
          option.value = ubicacion;
          option.textContent = ubicacion;
          select.appendChild(option);
        }
        if (typeof data === "string") {
          TS_decrypt(data, SECRET, (dec) => {
            if (dec) addUbicacion(dec);
          });
        } else {
          addUbicacion(data);
        }
      } catch (error) {
        console.warn(error)
      }
    });

    // Función para renderizar la tabla filtrada
    function renderTable(filtroUbicacion) {
      TS_IndexElement(
        "materiales",
        config,
        gun.get(TABLE).get("materiales"),
        document.getElementById("tableContainer"),
        undefined,
        function(data) {
          if (data.Ubicacion == filtroUbicacion) {return false}
          if (filtroUbicacion == "") {return false}
          return true
        }
      );
    }

    // Inicializar tabla sin filtro
    renderTable("");

    // Evento para filtrar por ubicación
    document.getElementById(select_ubicacion).onchange = function () {
      renderTable(this.value);
    };

    if (!checkRole("materiales:edit")) {
      document.getElementById(btn_new).style.display = "none"
    } else {
      document.getElementById(btn_new).onclick = () => {
        setUrlHash("materiales," + safeuuid(""));
      };
    }
  },
};
