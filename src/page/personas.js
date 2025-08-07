PAGES.personas = {
  navcss: "btn4",
  Title: "Personas",
  edit: function (mid) {
    var nameh1 = safeuuid();
    var field_nombre = safeuuid();
    var field_zona = safeuuid();
    var field_roles = safeuuid();
    var field_puntos = safeuuid();
    var field_notas = safeuuid();
    var field_anilla = safeuuid();
    var field_foto = safeuuid();
    var render_foto = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    container.innerHTML = `
                <h1>Persona <code id="${nameh1}"></code></h1>
                <fieldset>
                    <label>
                        Nombre<br>
                        <input type="text" id="${field_nombre}"><br><br>
                    </label>
                    <label>
                        Zona<br>
                        <input type="text" id="${field_zona}"><br><br>
                    </label>
                    <label>
                        Permisos<br>
                        <input type="text" id="${field_roles}"><br><br>
                    </label>
                    <label>
                        Puntos<br>
                        <input type="number" id="${field_puntos}"><br><br>
                    </label>
                    <label>
                        Anilla<br>
                        <input type="color" id="${field_anilla}"><br><br>
                    </label>
                    <label>
                        Foto (PNG o JPG)<br>
                        <img id="${render_foto}" height="100px" style="border: 3px inset; min-width: 7px;" src="static/camera2.png">
                        <input type="file" accept="image/*" id="${field_foto}" style="display: none;"><br><br>
                    </label>


                    <label>
                        Notas<br>
                        <textarea id="${field_notas}"></textarea><br><br>
                    </label><hr>
                    <button class="btn5" id="${btn_guardar}">Guardar</button>
                    <button class="rojo" id="${btn_borrar}">Borrar</button>
                </fieldset>
                `;
    var resized = "";
    gun
      .get(TABLE)
      .get("personas")
      .get(mid)
      .once((data, key) => {
        function load_data(data, ENC = "") {
          document.getElementById(nameh1).innerText = key;
          document.getElementById(field_nombre).value = data["Nombre"] || "";
          document.getElementById(field_zona).value = data["Region"] || "";
          document.getElementById(field_roles).value = data["Roles"] || "";
          document.getElementById(field_puntos).value = data["Puntos"] || 0;
          document.getElementById(field_anilla).value = data["SC_Anilla"] || "";
          // document.getElementById(field_foto).value = "";
          document.getElementById(render_foto).src =
            data["Foto"] || "static/ico/user_generic.png";
          resized = data["Foto"] || "static/ico/user_generic.png";
          document.getElementById(field_notas).value = data["markdown"] || "";
        }
        if (typeof data == "string") {
          SEA.decrypt(data, SECRET, (data) => {
            load_data(data, "%E");
          });
        } else {
          load_data(data);
        }
      });
    document
      .getElementById(field_foto)
      .addEventListener("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;

        resizeInputImage(
          file,
          function (url) {
            document.getElementById(render_foto).src = url;
            resized = url;
          },
          125,
          0.7
        );
      });
    document.getElementById(btn_guardar).onclick = () => {
      var data = {
        Nombre: document.getElementById(field_nombre).value,
        Region: document.getElementById(field_zona).value,
        Roles: document.getElementById(field_roles).value,
        Puntos: document.getElementById(field_puntos).value,
        SC_Anilla: document.getElementById(field_anilla).value,
        Foto: resized,
        markdown: document.getElementById(field_notas).value,
      };
      var enc = SEA.encrypt(data, SECRET, (encrypted) => {
        document.getElementById("actionStatus").style.display = "block";
        betterGunPut(gun.get(TABLE).get("personas").get(mid), encrypted);
        toastr.success("Guardado!");
        setTimeout(() => {
          document.getElementById("actionStatus").style.display = "none";
          setUrlHash("personas");
        }, 1500);
      });
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (confirm("¿Quieres borrar esta persona?") == true) {
        betterGunPut(gun.get(TABLE).get("personas").get(mid), null);
        toastr.error("Borrado!");
        setTimeout(() => {
          setUrlHash("personas");
        }, 1500);
      }
    };
  },
  index: function () {
    var btn_new = safeuuid();
    container.innerHTML = `
                <h1>Personas</h1>
                <button id="${btn_new}">Nueva Persona</button>
                <div id="tableContainer"></div>
                `;

    const config = [
      { 
        key: "Nombre", 
        label: "Nombre", 
        type: "template",
        template: (data, element) => {
          element.classList.add("TextBorder");
          element.style.backgroundColor = data.SC_Anilla;
          element.style.textAlign = "center";
          element.innerHTML = `
            <img src="${data.Foto || "static/ico/user_generic.png"}" height="50">
            <br>${data.Nombre || ""}
          `;
        }
      },
      { key: "Region", label: "Zona", type: "text", default: "?" },
      { key: "Puntos", label: "Puntos", type: "text", default: "0" },
      { key: "Roles", label: "Permisos", type: "text", default: "" }
    ];

    TS_IndexElement(
      "personas",
      config,
      gun.get(TABLE).get("personas"),
      document.getElementById("tableContainer"),
      (row, data) => {
        // Add gold background for high points
        const points = parseFloat(data.Puntos);
        if (points >= 10) {
          row.style.backgroundColor = "gold";
        }
      },
      undefined,
      true // Enable global search bar
    );

    document.getElementById(btn_new).onclick = () => {
      setUrlHash("personas," + safeuuid(""));
    };
  },
};
