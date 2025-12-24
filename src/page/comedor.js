PERMS["comedor"] = "Comedor"
PERMS["comedor:edit"] = "&gt; Editar"
PAGES.comedor = {
  navcss: "btn6",
  icon: "static/appico/apple.png",
  AccessControl: true,
  Title: "Comedor",
  edit: function (mid) {
    if (!checkRole("comedor:edit")) {setUrlHash("comedor");return}
    var nameh1 = safeuuid();
    var field_fecha = safeuuid();
    var field_platos = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    container.innerHTML = `
      <h1>Entrada del menú <code id="${nameh1}"></code></h1>
      <fieldset style="float: left;">
        <legend>Valores</legend>
        <label>
          Fecha<br>
          <input type="date" id="${field_fecha}" value=""><br><br>
        </label>
        <label>
          Platos<br>
          <textarea id="${field_platos}"></textarea><br><br>
        </label>
        <button class="btn5" id="${btn_guardar}">Guardar</button>
        <button class="rojo" id="${btn_borrar}">Borrar</button>
      </fieldset>
      `;
    DB.get('comedor', mid).then((data) => {
      function load_data(data, ENC = "") {
        document.getElementById(nameh1).innerText = mid;
        document.getElementById(field_fecha).value = data["Fecha"] || mid || CurrentISODate();
        document.getElementById(field_platos).value =
          data["Platos"] || "";
      }
      if (typeof data == "string") {
        TS_decrypt(data, SECRET, (data, wasEncrypted) => {
          load_data(data, "%E");
        }, 'comedor', mid);
      } else {
        load_data(data || {});
      }
    });
    document.getElementById(btn_guardar).onclick = () => {
      const newDate = document.getElementById(field_fecha).value;
      var data = {
        Fecha: newDate,
        Platos: document.getElementById(field_platos).value,
      };
      
      // If the date has changed, we need to delete the old entry
      if (mid !== newDate && mid !== "") {
        DB.del('comedor', mid);
      }
      
      document.getElementById("actionStatus").style.display = "block";
      DB.put('comedor', newDate, data).then(() => {
        toastr.success("Guardado!");
        setTimeout(() => {
          document.getElementById("actionStatus").style.display = "none";
          setUrlHash("comedor");
        }, SAVE_WAIT);
      }).catch((e) => { console.warn('DB.put error', e); });
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (confirm("¿Quieres borrar esta entrada?") == true) {
        DB.del('comedor', mid).then(() => {
          toastr.error("Borrado!");
          setTimeout(() => {
            setUrlHash("comedor");
          }, SAVE_WAIT);
        });
      }
    };
  },
  index: function () {
    if (!checkRole("comedor")) {setUrlHash("index");return}
    const cont = safeuuid();
    var btn_new = safeuuid();
    container.innerHTML = `
      <h1>Menú del comedor</h1>
      <button id="${btn_new}">Nueva entrada</button>
      <div id="${cont}"></div>
      `;
    TS_IndexElement(
      "comedor",
      [
        {
          key: "Fecha",
          type: "raw",
          default: "",
          label: "Fecha",
        },
        {
          key: "Platos",
          type: "raw",
          default: "",
          label: "Platos",
        }
      ],
      "comedor",
      document.getElementById(cont),
      (data, new_tr) => {
        // new_tr.style.backgroundColor = "#FFCCCB";
        if (data.Fecha == CurrentISODate()) {
          new_tr.style.backgroundColor = "lightgreen";
        }
      }
    );
    
      if (!checkRole("comedor:edit")) {
        document.getElementById(btn_new).style.display = "none"
      } else {
        document.getElementById(btn_new).onclick = () => {
          setUrlHash("comedor," + safeuuid(""));
        };
      }
  },
};
