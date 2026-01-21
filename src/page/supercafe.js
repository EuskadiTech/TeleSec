PERMS["supercafe"] = "Cafetería";
PERMS["supercafe:edit"] = "&gt; Editar";
PAGES.supercafe = {
  navcss: "btn4",
  icon: "static/appico/cup.png",
  AccessControl: true,
  Title: "Cafetería",
  edit: function (mid) {
    if (!checkRole("supercafe:edit")) {
      setUrlHash("supercafe");
      return;
    }
    var nameh1 = safeuuid();
    var field_fecha = safeuuid();
    var field_persona = safeuuid();
    var field_comanda = safeuuid();
    var field_notas = safeuuid();
    var field_estado = safeuuid();
    var div_actions = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    container.innerHTML = `
      <h1>Comanda <code id="${nameh1}"></code></h1>
      <button onclick="setUrlHash('supercafe');">Salir</button>
      <fieldset style="text-align: center;">
          <legend>Rellenar comanda</legend>
          <label style="display: none;">
              Fecha<br>
              <input readonly disabled type="text" id="${field_fecha}" value=""><br><br>
          </label>
          <label style="display: none;">
              Persona<br>
              <input type="hidden" id="${field_persona}">
              <br><br>
          </label>
          <label style="display: none;">
              Comanda (utiliza el panel de relleno)<br>
              <textarea readonly disabled id="${field_comanda}"></textarea><br><br>
          </label>
          <div id="${div_actions}" open>
            <!--<summary>Mostrar botones de relleno</summary>-->
          </div>
          <label>
              Notas<br>
              <textarea id="${field_notas}"></textarea><br><br>
          </label>
          <label style="display: none;">
              Estado<br>
              <input readonly disabled type="text" id="${field_estado}" value="%%">
              <br>Modificar en el listado de comandas<br>
          </label>
          <button id=${btn_guardar} class="btn5">Guardar</button>
          <button id=${btn_borrar} class="rojo">Borrar</button>
      </fieldset>
      `;
    var currentData = {};
    var currentPersonaID = "";
    var divact = document.getElementById(div_actions);

    function loadActions() {
      divact.innerHTML = "";
      addCategory_Personas(divact, SC_Personas, currentPersonaID, (value) => {
        document.getElementById(field_persona).value = value;
      });
      Object.entries(SC_actions).forEach((category) => {
        addCategory(
          divact,
          category[0],
          SC_actions_icons[category[0]],
          category[1],
          currentData,
          (values) => {
            document.getElementById(field_comanda).value = SC_parse(values);
          }
        );
      });
    }
    loadActions();
    DB.get('supercafe', mid).then((data) => {
      function load_data(data, ENC = "") {
        document.getElementById(nameh1).innerText = mid;
        document.getElementById(field_fecha).value = data["Fecha"] || CurrentISODate();
        document.getElementById(field_persona).value = data["Persona"] || "";
        currentPersonaID = data["Persona"] || "";
        document.getElementById(field_comanda).value =
          SC_parse(JSON.parse(data["Comanda"] || "{}")) || "";
        document.getElementById(field_notas).value = data["Notas"] || "";
        document.getElementById(field_estado).value = data["Estado"] || "%%";
        currentData = JSON.parse(data["Comanda"] || "{}");

        loadActions();
      }
      if (typeof data == "string") {
        TS_decrypt(data, SECRET, (data, wasEncrypted) => {
          load_data(data, "%E");
        }, 'supercafe', mid);
      } else {
        load_data(data || {});
      }
    });
    document.getElementById(btn_guardar).onclick = () => {
      // Check if button is already disabled to prevent double-clicking
      var guardarBtn = document.getElementById(btn_guardar);
      if (guardarBtn.disabled) return;
      
      // Validate before disabling button
      if (document.getElementById(field_persona).value == "") {
        alert("¡Hay que elegir una persona!");
        return;
      }
      
      // Disable button after validation passes
      guardarBtn.disabled = true;
      guardarBtn.style.opacity = "0.5";
      
      var data = {
        Fecha: document.getElementById(field_fecha).value,
        Persona: document.getElementById(field_persona).value,
        Comanda: JSON.stringify(currentData),
        Notas: document.getElementById(field_notas).value,
        Estado: document
          .getElementById(field_estado)
          .value.replace("%%", "Pedido"),
      };
      document.getElementById("actionStatus").style.display = "block";
      DB.put('supercafe', mid, data).then(() => {
        toastr.success("Guardado!");
        setTimeout(() => {
          document.getElementById("actionStatus").style.display = "none";
          setUrlHash("supercafe");
        }, SAVE_WAIT);
      }).catch((e) => { 
        console.warn('DB.put error', e); 
        guardarBtn.disabled = false;
        guardarBtn.style.opacity = "1";
        document.getElementById("actionStatus").style.display = "none";
        toastr.error("Error al guardar la comanda");
      });
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (
        confirm(
          "¿Quieres borrar esta comanda? - NO se actualizará el monedero de la persona asignada."
        ) == true
      ) {
        DB.del('supercafe', mid).then(() => {
          setTimeout(() => {
            setUrlHash("supercafe");
          }, SAVE_WAIT);
        });
      }
    };
  },
  index: function () {
    if (!checkRole("supercafe")) {
      setUrlHash("index");
      return;
    }
    var tts = false;
    var sc_nobtn = "";
    if (urlParams.get("sc_nobtn") == "yes") {
      sc_nobtn = "pointer-events: none; opacity: 0.5";
    }
    var ev = setTimeout(() => {
      tts = true;
      console.log("TTS Enabled");
      toastr.info("Texto a voz disponible");
    }, 6500);
    EventListeners.Timeout.push(ev);
    const tablebody = safeuuid();
    const tablebody2 = safeuuid();
    var btn_new = safeuuid();
    var totalprecio = safeuuid();
    var tts_check = safeuuid();
    var old = {};
    container.innerHTML = `
      <h1>Cafetería - Total: <span id="${totalprecio}">0</span>c</h1>
      <button id="${btn_new}" style="${sc_nobtn};">Nueva comanda</button>
      <br>
      <label>
        <b>Habilitar avisos:</b>
        <input type="checkbox" id="${tts_check}" style="height: 25px;width: 25px;">
      </label>

      <details style="background: beige; padding: 15px; border-radius: 15px; border: 2px solid black" open>
        <summary>Todas las comandas</summary>
        <div id="cont1"></div>
      </details>
      <br>
      <details style="background: lightpink; padding: 15px; border-radius: 15px; border: 2px solid black" open>
        <summary>Deudas</summary>
        <div id="cont2"></div>
      </details>
      `;
    var config = [
      {
        key: "Persona",
        type: "persona",
        default: "",
        label: "Persona",
      },
      {
        key: "Estado",
        type: "comanda-status",
        default: "",
        label: "Estado",
      },
      {
        key: "Comanda",
        type: "comanda",
        default: "",
        label: "Comanda",
      },
    ];
    if (!checkRole("supercafe:edit")) {
      config = [
        {
          key: "Persona",
          type: "persona",
          default: "",
          label: "Persona",
        },
        {
          key: "Comanda",
          type: "comanda",
          default: "",
          label: "Comanda",
        },
      ];
    }
    //Todas las comandas
    var comandasTot = {};
    function calcPrecio() {
      var tot = 0;
      Object.values(comandasTot).forEach((precio) => {
        tot += precio;
      });
      document.getElementById(totalprecio).innerText = tot;
      return tot;
    }
    TS_IndexElement(
      "supercafe",
      config,
      "supercafe",
      document.querySelector("#cont1"),
      (data, new_tr) => {
        // new_tr.style.backgroundColor = "#FFCCCB";
        comandasTot[data._key] = SC_priceCalc(JSON.parse(data.Comanda))[0];
        calcPrecio();
        if (data.Estado == "Pedido") {
          new_tr.style.backgroundColor = "#FFFFFF";
        }
        if (data.Estado == "En preparación") {
          new_tr.style.backgroundColor = "#FFCCCB";
        }
        if (data.Estado == "Listo") {
          new_tr.style.backgroundColor = "gold";
        }
        if (data.Estado == "Entregado") {
          new_tr.style.backgroundColor = "lightgreen";
        }
        if (data.Estado == "Deuda") {
          new_tr.style.backgroundColor = "#f5d3ff";
        }
      },
      (data) => {
        if (data.Estado == "Deuda") {
          return true;
        }
        var key = data._key;
        if (old[key] == undefined) {
          old[key] = "";
        }
        if (old[key] != data.Estado) {
          if (tts && document.getElementById(tts_check).checked) {
            var msg = `Comanda de ${SC_Personas[data.Persona].Region}. - ${
              JSON.parse(data.Comanda)["Selección"]
            }. - ${SC_Personas[data.Persona].Nombre}. - ${data.Estado}`;
            let utterance = new SpeechSynthesisUtterance(msg);
            utterance.rate = 0.9;
            // utterance.voice = speechSynthesis.getVoices()[7]
            speechSynthesis.speak(utterance);
          }
        }
        old[key] = data.Estado;
      }
    );

    //Deudas
    TS_IndexElement(
      "supercafe",
      config,
      "supercafe",
      document.querySelector("#cont2"),
      (data, new_tr) => {
        // new_tr.style.backgroundColor = "#FFCCCB";
        comandasTot[data._key] = 0; // No mostrar comandas en deuda.
        calcPrecio();

        if (data.Estado == "Pedido") {
          new_tr.style.backgroundColor = "#FFFFFF";
        }
        if (data.Estado == "En preparación") {
          new_tr.style.backgroundColor = "#FFCCCB";
        }
        if (data.Estado == "Listo") {
          new_tr.style.backgroundColor = "gold";
        }
        if (data.Estado == "Entregado") {
          new_tr.style.backgroundColor = "lightgreen";
        }
        if (data.Estado == "Deuda") {
          new_tr.style.backgroundColor = "#f5d3ff";
        }
      },
      (data) => {
        if (data.Estado != "Deuda") {
          return true;
        }
        var key = data._key;
        if (old[key] == undefined) {
          old[key] = "";
        }
        if (old[key] != data.Estado) {
          if (tts && document.getElementById(tts_check).checked) {
            var msg = `Comanda de ${SC_Personas[data.Persona].Region}. - ${
              JSON.parse(data.Comanda)["Selección"]
            }. - ${SC_Personas[data.Persona].Nombre}. - ${data.Estado}`;
            let utterance = new SpeechSynthesisUtterance(msg);
            utterance.rate = 0.9;
            // utterance.voice = speechSynthesis.getVoices()[7]
            speechSynthesis.speak(utterance);
          }
        }
        old[key] = data.Estado;
      }
    );
    if (!checkRole("supercafe:edit")) {
      document.getElementById(btn_new).style.display = "none";
    } else {
      document.getElementById(btn_new).onclick = () => {
        setUrlHash("supercafe," + safeuuid(""));
      };
    }
  },
};
