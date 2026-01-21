PERMS["materiales"] = "Almacén";
PERMS["materiales:edit"] = "&gt; Editar";
PAGES.materiales = {
  navcss: "btn2",
  icon: "static/appico/shelf.png",
  AccessControl: true,
  Title: "Almacén",
  edit: function (mid) {
    if (!checkRole("materiales:edit")) {
      setUrlHash("materiales");
      return;
    }
    var nameh1 = safeuuid();
    var field_nombre = safeuuid();
    var field_revision = safeuuid();
    var field_cantidad = safeuuid();
    var field_unidad = safeuuid();
    var field_cantidad_min = safeuuid();
    var field_ubicacion = safeuuid();
    var field_notas = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    var FECHA_ISO = new Date().toISOString().split("T")[0];
    container.innerHTML = `
      <h1>Material <code id="${nameh1}"></code></h1>
      ${BuildQR("materiales," + mid, "Este Material")}
      <fieldset>
        <label>
          Fecha Revisión<br>
          <input type="date" id="${field_revision}"> <a onclick='document.getElementById("${field_revision}").value = "${FECHA_ISO}";'>Hoy - Contado todas las existencias</a><br><br>
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
    DB.get('materiales', mid).then((data) => {
      function load_data(data, ENC = "") {
        document.getElementById(nameh1).innerText = mid;
        document.getElementById(field_nombre).value = data["Nombre"] || "";
        document.getElementById(field_unidad).value =
          data["Unidad"] || "unidad(es)";
        document.getElementById(field_cantidad).value =
          data["Cantidad"] || "";
        document.getElementById(field_cantidad_min).value =
          data["Cantidad_Minima"] || "";
        document.getElementById(field_ubicacion).value =
          data["Ubicacion"] || "-";
        document.getElementById(field_revision).value =
          data["Revision"] || "-";
        document.getElementById(field_notas).value = data["Notas"] || "";
      }
      if (typeof data == "string") {
        TS_decrypt(data, SECRET, (data, wasEncrypted) => {
          load_data(data, "%E");
        }, 'materiales', mid);
      } else {
        load_data(data || {});
      }
    });
    document.getElementById(btn_guardar).onclick = () => {
      // Disable button to prevent double-clicking
      var guardarBtn = document.getElementById(btn_guardar);
      if (guardarBtn.disabled) return;
      
      guardarBtn.disabled = true;
      guardarBtn.style.opacity = "0.5";
      
      var data = {
        Nombre: document.getElementById(field_nombre).value,
        Unidad: document.getElementById(field_unidad).value,
        Cantidad: document.getElementById(field_cantidad).value,
        Cantidad_Minima: document.getElementById(field_cantidad_min).value,
        Ubicacion: document.getElementById(field_ubicacion).value,
        Revision: document.getElementById(field_revision).value,
        Notas: document.getElementById(field_notas).value,
      };
      document.getElementById("actionStatus").style.display = "block";
      DB.put('materiales', mid, data).then(() => {
        toastr.success("Guardado!");
        setTimeout(() => {
          document.getElementById("actionStatus").style.display = "none";
          setUrlHash("materiales");
        }, SAVE_WAIT);
      }).catch((e) => { 
        console.warn('DB.put error', e);
        guardarBtn.disabled = false;
        guardarBtn.style.opacity = "1";
        document.getElementById("actionStatus").style.display = "none";
      });
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (confirm("¿Quieres borrar este material?") == true) {
        DB.del('materiales', mid).then(() => {
          toastr.error("Borrado!");
          setTimeout(() => {
            setUrlHash("materiales");
          }, SAVE_WAIT);
        });
      }
    };
  },
  index: function () {
    if (!checkRole("materiales")) {
      setUrlHash("index");
      return;
    }
    var btn_new = safeuuid();
    var select_ubicacion = safeuuid();
    var check_lowstock = safeuuid();
    var tableContainer = safeuuid();
    container.innerHTML = `
      <h1>Materiales del Almacén</h1>
      <label>
        <b>Solo lo que falta:</b>
        <input type="checkbox" id="${check_lowstock}" style="height: 25px;width: 25px;">
      </label><br>
      <label>Filtrar por ubicación:
        <select id="${select_ubicacion}">
          <option value="">(Todas)</option>
        </select>
      </label>
      <button id="${btn_new}">Nuevo Material</button>
      <div id="${tableContainer}"></div>
    `;

    const config = [
      { key: "Revision", label: "Ult. Revisión", type: "fecha-diff", default: "" },
      { key: "Nombre", label: "Nombre", type: "text", default: "" },
      { key: "Ubicacion", label: "Ubicación", type: "text", default: "--" },
      {
        key: "Cantidad",
        label: "Cantidad",
        type: "template",
        template: (data, element) => {
          const min = parseFloat(data.Cantidad_Minima);
          const act = parseFloat(data.Cantidad);
          const sma = act < min ? `<small>- min. ${data.Cantidad_Minima || "?"}</small>` : ""
          element.innerHTML = `${data.Cantidad || "?"} ${
            data.Unidad || "?"
          } ${sma}`;
        },
        default: "?",
      },
      { key: "Notas", label: "Notas", type: "text", default: "" },
    ];

    // Obtener todas las ubicaciones únicas y poblar el <select>, desencriptando si es necesario
    DB.map("materiales", (data, key) => {
      try {
        if (!data) return;

        function addUbicacion(d) {
          const ubicacion = d.Ubicacion || "-";
          const select = document.getElementById(select_ubicacion);

          if (!select) {
            console.warn(`Element with ID "${select_ubicacion}" not found.`);
            return;
          }

          const optionExists = Array.from(select.options).some(
            (opt) => opt.value === ubicacion
          );
          if (!optionExists) {
            const option = document.createElement("option");
            option.value = ubicacion;
            option.textContent = ubicacion;
            select.appendChild(option);
          }
        }

        if (typeof data === "string") {
          TS_decrypt(data, SECRET, (dec, wasEncrypted) => {
            if (dec && typeof dec === "object") {
              addUbicacion(dec);
            }
          }, 'materiales', key);
        } else {
          addUbicacion(data);
        }
      } catch (error) {
        console.warn("Error processing ubicacion:", error);
      }
    });

    // Función para renderizar la tabla filtrada
    function renderTable(filtroUbicacion) {
      TS_IndexElement(
        "materiales",
        config,
        "materiales",
        document.getElementById(tableContainer),
        function (data, new_tr) {
          if (parseFloat(data.Cantidad) < parseFloat(data.Cantidad_Minima)) {
            new_tr.style.background = "#fcfcb0";
          }
          if (parseFloat(data.Cantidad) <= 0) {
            new_tr.style.background = "#ffc0c0";
          }
          if ((data.Cantidad || "?") == "?") {
            new_tr.style.background = "#d0d0ff";
          }
          if ((data.Revision || "?") == "?") {
            new_tr.style.background = "#d0d0ff";
          }
        },
        function (data) {
          var is_low_stock =
            !document.getElementById(check_lowstock).checked ||
            parseFloat(data.Cantidad) < parseFloat(data.Cantidad_Minima);

          var is_region =
            filtroUbicacion === "" || data.Ubicacion === filtroUbicacion;
          
          return !(is_low_stock && is_region);
        }
      );
    }

    // Inicializar tabla sin filtro
    renderTable("");

    // Evento para filtrar por ubicación
    document.getElementById(select_ubicacion).onchange = function () {
      renderTable(this.value);
    };
    // Recargar al cambiar filtro
    document.getElementById(check_lowstock).onchange = function () {
      renderTable(document.getElementById(select_ubicacion).value);
    };

    if (!checkRole("materiales:edit")) {
      document.getElementById(btn_new).style.display = "none";
    } else {
      document.getElementById(btn_new).onclick = () => {
        setUrlHash("materiales," + safeuuid(""));
      };
    }
  },
};
