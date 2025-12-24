PAGES.dataman = {
  navcss: "btn1",
  icon: "static/appico/gear_edit.png",
  AccessControl: true,
  Title: "Ajustes",
  edit: function (mid) {
    switch (mid) {
      case "export":
        PAGES.dataman.__export();
        break;
      case "import":
        PAGES.dataman.__import();
        break;
      case "config":
        PAGES.dataman.__config();
        break;
      case "labels":
        PAGES.dataman.__labels();
        break;
      default:
      // Tab to edit
    }
  },
  __config: function () {
    var form = safeuuid();
    container.innerHTML = `
    <h1>Ajustes</h1>
    <h2>No disponible</h2>
    <form id="${form}">
      <label>
        <input type="checkbox" name="block_add_account" value="yes">
        <b>Bloquear crear cuenta de administrador?</b>
      </label>
      <button type="submit">Aplicar ajustes</button>
    </form>
    `;
    document.getElementById(form).onsubmit = (ev) => {
      ev.preventDefault();
      var ford = new FormData(document.getElementById(form));
      if (ford.get("block_add_account") == "yes") {
        config["block_add_account"] = true;
      }
    };
  },
  __export: function () {
    var select_type = safeuuid();
    var textarea_content = safeuuid();
    var button_export_local = safeuuid();
    var button_export_safe = safeuuid();
    var button_export_safe_cloud = safeuuid();
    var button_clear = safeuuid();
    container.innerHTML = `
      <h1>Exportar Datos</h1>
      <fieldset>
        <legend>Exportar datos</legend>
        <em>Al pulsar, Espera hasta que salga una notificacion verde.</em>
        <br>
        <br>
        <button id="${button_export_local}" type="button">Exportar sin cifrar</button>
        <button id="${button_export_safe}" type="button">Exportar con cifrado</button>
        <button id="${button_export_safe_cloud}" style="display: none;" type="button">Exportar a EuskadiTech - cifrado</button>
        <!--<br><br><em>Para descargar envia un correo a telesec@tech.eus con el asunto "TSBK %${getDBName()}".</em>-->
      </fieldset>
      `;
    document.getElementById(button_export_local).onclick = () => {
      var data_export = {};
      var output = {
        materiales: {},
        personas: {},
      };
      (async () => {
        const materiales = await DB.list('materiales');
        materiales.forEach(entry => {
          const key = entry.id;
          const value = entry.data;
          if (value != null) {
            if (typeof value == 'string') {
              TS_decrypt(value, SECRET, (data, wasEncrypted) => {
                output.materiales[key] = data;
              }, 'materiales', key);
            } else {
              output.materiales[key] = value;
            }
          }
        });
        const personas = await DB.list('personas');
        personas.forEach(entry => {
          const key = entry.id;
          const value = entry.data;
          if (value != null) {
            if (typeof value == 'string') {
              TS_decrypt(value, SECRET, (data, wasEncrypted) => {
                output.personas[key] = data;
              }, 'personas', key);
            } else {
              output.personas[key] = value;
            }
          }
        });
        toastr.success("Exportado todo, descargando!");
        download(
          `Export %%TITLE%% ${getDBName()}.json.txt`,
          JSON.stringify(output)
        );
      })();
    };
    document.getElementById(button_export_safe).onclick = () => {
      (async () => {
        const result = { materiales: {}, personas: {} };
        const materiales = await DB.list('materiales');
        materiales.forEach(entry => { result.materiales[entry.id] = entry.data; });
        const personas = await DB.list('personas');
        personas.forEach(entry => { result.personas[entry.id] = entry.data; });
        toastr.success("Exportado todo, descargado!");
        download(
          `Export %%TITLE%% Encriptado ${getDBName()}.json.txt`,
          JSON.stringify(result)
        );
      })();
    };
    // document.getElementById(button_export_safe_cloud).onclick = () => {
    //   var download_data = (DATA) => {
    //     toastr.info("Exportado todo, subiendo!");
    //     fetch(
    //       "https://telesec-sync.tech.eus/upload_backup.php?table=" + getDBName(),
    //       {
    //         method: "POST",
    //         body: JSON.stringify(DATA),
    //       }
    //     )
    //       .then(() => {
    //         toastr.success("Subido correctamente!");
    //       })
    //       .catch(() => {
    //         toastr.error("Ha ocurrido un error en la subida.");
    //       });
    //   };
    //   gun.get(TABLE).load(download_data);
    // };
  },
  __import: function () {
    var select_type = safeuuid();
    var textarea_content = safeuuid();
    var button_import = safeuuid();
    var button_clear = safeuuid();
    container.innerHTML = `
      <h1>Importar Datos</h1>
      <fieldset>
          <legend>Importar datos</legend>
          <em>Espera hasta que se vacien todas las notificaciones.</em>
          <select id="${select_type}">
              <option value="" disabled selected>Tipo de archivo...</option>
              <option value="comedor">Galileo - db.comedor.axd</option>
              <option value="recetas">Galileo - db.recetas.axd</option>
              <option value="materiales">Galileo - db.materiales.axd</option>
              <option value="personas">Galileo - db.personas.axd</option>
              <option value="comandas">Galileo - db.cafe.comandas.axd</option>
              <option value="%telesec">TeleSec Exportado (encriptado o no)</option>
          </select>
          <textarea id="${textarea_content}" style="height: 100px;" placeholder="Introduce el contenido del archivo"></textarea>
          <button id="${button_import}" type="button">Importar</button>
          <button id="${button_clear}" type="button">Vaciar</button>
      </fieldset>
            `;
    document.getElementById(button_import).onclick = () => {
      toastr.info("Importando datos...");
      var val = document.getElementById(textarea_content).value;
      var sel = document.getElementById(select_type).value;
      if (sel == "%telesec") {
        // legacy import, store entire payload as-is
        // for each top-level key, store their items in DB
        var parsed = JSON.parse(val);
        Object.entries(parsed).forEach((section) => {
          const sectionName = section[0];
          const sectionData = section[1];
          Object.entries(sectionData).forEach((entry) => {
            DB.put(sectionName, entry[0], entry[1]).catch((e) => { console.warn('DB.put error', e); });
          });
        });
      } else {
        Object.entries(JSON.parse(val)["data"]).forEach((entry) => {
          DB.put(sel, entry[0], entry[1]).catch((e) => { console.warn('DB.put error', e); });
        });
      }
      setTimeout(() => {
        toastr.info("Importado todo!");

        if (sel == "%telesec") {
          setUrlHash("inicio");
        } else {
          setUrlHash(sel);
        }
      }, 5000);
    };
  },
  __labels: function (mid) {
    var div_materiales = safeuuid();
    container.innerHTML = `
      <h1>Imprimir Etiquetas QR</h1>
      <button onclick="print()">Imprimir</button>
      <h2>Materiales</h2>
      <div id="${div_materiales}"></div>
      <br><br>`;
    div_materiales = document.getElementById(div_materiales);
    DB.map('materiales', (data, key) => {
      function add_row(data, key) {
        if (data != null) {
          div_materiales.innerHTML += BuildQR(
            "materiales," + key,
            data["Nombre"] || key
          );
        }
      }
      if (typeof data == "string") {
        TS_decrypt(data, SECRET, (data) => {
            add_row(data, key);
          });
        } else {
          add_row(data, key);
        }
      });
  },
  index: function () {
    container.innerHTML = `
    <h1>Administración de datos</h1>
    <a class="button" href="#dataman,import">Importar datos</a>
    <a class="button" href="#dataman,export">Exportar datos</a>
    <a class="button" href="#dataman,labels">Imprimir etiquetas</a>
    <a class="button" href="#dataman,config">Ajustes</a>
    `;
  },
};
