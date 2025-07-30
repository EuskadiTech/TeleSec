PAGES.materiales = {
    navcss: "btn2",
    Title: "Materiales",
    edit: function (mid) {
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
          Unidad: document.getElementById(field_unidad).value,
          Cantidad: document.getElementById(field_cantidad).value,
          Cantidad_Minima: document.getElementById(field_cantidad_min).value,
          Ubicacion: document.getElementById(field_ubicacion).value,
          Referencia: document.getElementById(field_referencia).value,
          Notas: document.getElementById(field_notas).value,
        };
        var enc = SEA.encrypt(data, SECRET, (encrypted) => {
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
      const tablebody = safeuuid();
      var btn_new = safeuuid();
      container.innerHTML = `
                <h1>Materiales</h1>
                <button id="${btn_new}">Nuevo Material</button>
                <div id="scrolltable"><table>
                    <thead>
                        <tr>
                            <th>Referencia</th>
                            <th>Nombre</th>
                            <th>Ubicación</th>
                            <th>Cantidad</th>
                            <th>Notas</th>
                        </tr>
                    </thead>
                    <tbody id="${tablebody}">
                    </tbody>
                </table></div>
                `;
      tableScroll("#scrolltable");
      var tablebody_EL = document.getElementById(tablebody);
      var rows = {};
      function render() {
        function sorter(a, b) {
          if (a.Nombre < b.Nombre) {
            return -1;
          }
          if (a.Nombre > b.Nombre) {
            return 1;
          }
          return 0;
        }
        var tablebody_EL = document.getElementById(tablebody);
        tablebody_EL.innerHTML = "";
        Object.values(rows)
          .sort(sorter)
          .forEach((data) => {
            var new_tr = document.createElement("tr");
            new_tr.innerHTML = `
                    <td>${data.Referencia || "?"}</td>
                    <td>${data.Nombre || "?"}</td>
                    <td>${data.Ubicacion || "?"}</td>
                    <td>${data.Cantidad || "?"} ${data.Unidad || "?"}</td>
                    <td>${data.Notas || "?"}</td>
                    `;
            var min = parseFloat(data.Cantidad_Minima);
            var act = parseFloat(data.Cantidad);
            if (act < min) {
              new_tr.style.backgroundColor = "lightcoral";
            }
            new_tr.onclick = () => {
              setUrlHash("materiales," + data._key);
            };
            tablebody_EL.append(new_tr);
          });
      }
      gun
        .get(TABLE)
        .get("materiales")
        .map()
        .on((data, key, _msg, _ev) => {
          EVENTLISTENER = _ev;
          if (data != null) {
            function add_row(data, key) {
              if (data != null) {
                data["_key"] = key;
                rows[key] = data;
              } else {
                delete rows[key];
              }
              render();
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
      document.getElementById(btn_new).onclick = () => {
        setUrlHash("materiales," + safeuuid(""));
      };
    },
  }