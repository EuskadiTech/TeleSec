PAGES.resumen_diario = {
  navcss: "btn3",
  Title: "Resumen Semanal",
  index: function () {
    var table_materialesLow = safeuuid();
    var table_personasHigh = safeuuid();
    container.innerHTML = `
                <h1>Resumen Semanal</h1>
                <h2>Personas con café gratis (para el Viernes)</h2>
                <div id="${table_personasHigh}"></div>
                <h2>Materiales faltantes (o por llegar)</h2>
                <div id="${table_materialesLow}"></div>
            `;
    var materiales_low = {};
    var personas_high = {};
    function render_materialesLow() {
      function sorter(a, b) {
        if (a.Nombre < b.Nombre) {
          return -1;
        }
        if (a.Nombre > b.Nombre) {
          return 1;
        }
        return 0;
      }
      var tablebody_EL = document.getElementById(table_materialesLow);
      tablebody_EL.innerHTML = "";
      Object.values(materiales_low)
        .sort(sorter)
        .forEach((data) => {
          var min = parseFloat(data.Cantidad_Minima);
          var act = parseFloat(data.Cantidad);
          var falta = min - act;
          if (act < min) {
            var new_tr = document.createElement("span");
            new_tr.innerHTML = `<b>${data.Nombre || "?"}</b><br>Faltan ${
              falta || "?"
            } ${data.Unidad || "?"} <br><i style="font-size: 75%">${
              data.Ubicacion || "?"
            }</i>`;
            new_tr.className = PAGES["materiales"].navcss;
            new_tr.style.display = "inline-block";
            new_tr.style.margin = "5px";
            new_tr.style.padding = "5px";
            new_tr.style.borderRadius = "5px";
            new_tr.style.border = "2px solid black";
            new_tr.style.cursor = "pointer";
            new_tr.onclick = () => {
              setUrlHash("materiales," + data._key);
            };
            tablebody_EL.append(new_tr);
          }
        });
    }
    gun
      .get(TABLE)
      .get("materiales")
      .map()
      .on((data, key, _msg, _ev) => {
        EVENTLISTENER2 = _ev;
        if (data != null) {
          function add_row(data, key) {
            if (data != null) {
              data["_key"] = key;
              materiales_low[key] = data;
            } else {
              delete materiales_low[key];
            }
            render_materialesLow();
          }
          if (typeof data == "string") {
            SEA.decrypt(data, SECRET, (data) => {
              add_row(data, key);
            });
          } else {
            add_row(data, key);
          }
        }
      });
    function render_personasHigh() {
      function sorter(a, b) {
        if (a.Nombre < b.Nombre) {
          return -1;
        }
        if (a.Nombre > b.Nombre) {
          return 1;
        }
        return 0;
      }
      var tablebody_EL = document.getElementById(table_personasHigh);
      tablebody_EL.innerHTML = "";
      Object.values(personas_high)
        .sort(sorter)
        .forEach((data) => {
          if (data.Puntos >= 10) {
            var new_tr = document.createElement("span");
            new_tr.innerHTML = `<img src="${
              data.Foto || ""
            }" alt="" height="55" style="float: left; margin-right: 5px;"><b>${
              data.Nombre || "?"
            }</b><br>Tiene ${
              data.Puntos || "?"
            } puntos <br><i style="font-size: 75%">${data.Region || "?"}</i>`;
            new_tr.className = PAGES["personas"].navcss;
            new_tr.style.display = "inline-block";
            new_tr.style.margin = "5px";
            new_tr.style.padding = "5px";
            new_tr.style.borderRadius = "5px";
            new_tr.style.border = "2px solid black";
            new_tr.style.cursor = "pointer";
            new_tr.style.width = "200px";

            new_tr.onclick = () => {
              setUrlHash("personas," + data._key);
            };
            tablebody_EL.append(new_tr);
          }
        });
    }
    gun
      .get(TABLE)
      .get("personas")
      .map()
      .on((data, key, _msg, _ev) => {
        EVENTLISTENER = _ev;
        if (data != null) {
          function add_row(data, key) {
            if (data != null) {
              data["_key"] = key;
              personas_high[key] = data;
            } else {
              delete personas_high[key];
            }
            render_personasHigh();
          }
          if (typeof data == "string") {
            SEA.decrypt(data, SECRET, (data) => {
              add_row(data, key);
            });
          } else {
            add_row(data, key);
          }
        }
      });
  },
};
