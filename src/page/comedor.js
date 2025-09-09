PERMS["comedor"] = "Menú comedor"
PERMS["comedor:edit"] = "&gt; Editar"
PAGES.comedor = {
  navcss: "btn6",
  icon: "static/appico/Meal.svg",
  AccessControl: true,
  Title: "Menú comedor",
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
                        <input type="date" id="${field_fecha}" value="${CurrentISODate()}"><br><br>
                    </label>
                    <label>
                        Platos<br>
                        <textarea id="${field_platos}"></textarea><br><br>
                    </label>
                    <button class="btn5" id="${btn_guardar}">Guardar</button>
                    <button class="rojo" id="${btn_borrar}">Borrar</button>
                </fieldset>
                `;
    gun
      .get(TABLE)
      .get("comedor")
      .get(mid)
      .once((data, key) => {
        function load_data(data, ENC = "") {
          document.getElementById(nameh1).innerText = key;
          document.getElementById(field_fecha).value = data["Fecha"];
          document.getElementById(field_platos).value =
            data["Platos"] || "";
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
      const newDate = document.getElementById(field_fecha).value;
      var data = {
        Fecha: newDate,
        Platos: document.getElementById(field_platos).value,
      };
      
      // If the date has changed, we need to delete the old entry
      if (mid !== newDate && mid !== "") {
        betterGunPut(gun.get(TABLE).get("comedor").get(mid), null);
      }
      
      var enc = TS_encrypt(data, SECRET, (encrypted) => {
        document.getElementById("actionStatus").style.display = "block";
        betterGunPut(gun.get(TABLE).get("comedor").get(newDate), encrypted);
        toastr.success("Guardado!");
        setTimeout(() => {
          document.getElementById("actionStatus").style.display = "none";
          setUrlHash("comedor");
        }, 1500);
      });
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (confirm("¿Quieres borrar esta entrada?") == true) {
        betterGunPut(gun.get(TABLE).get("comedor").get(mid), null);
        toastr.error("Borrado!");
        setTimeout(() => {
          setUrlHash("comedor");
        }, 1500);
      }
    };
  },
  index: function () {
    if (!checkRole("comedor")) {setUrlHash("index");return}
    const tablebody = safeuuid();
    var btn_new = safeuuid();
    container.innerHTML = `
                <h1>Menú del comedor</h1>
                <button id="${btn_new}">Nueva entrada</button>
                <div id="cont"></div>
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
      gun.get(TABLE).get("comedor"),
      document.querySelector("#cont"),
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
