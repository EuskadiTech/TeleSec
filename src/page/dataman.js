PAGES.dataman = {
  navcss: "btn1",
  icon: "static/appico/Cogs.svg",
  AccessControl: true,
  Title: "Ajustes",
  edit: function(mid) {
    switch (mid) {
      case 'export':
        PAGES.dataman.__export()
        break;
      case 'import':
        PAGES.dataman.__import()
        break;
      default:
        // Tab to edit
    }
  },
  __export: function() {
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
          <!--<br><br><em>Para descargar envia un correo a telesec@tech.eus con el asunto "TSBK %${GROUPID}".</em>-->
      </fieldset>
            `;
    document.getElementById(button_export_local).onclick = () => {
      var data_export = {};
      var output = {
        materiales: {},
        personas: {},
      };
      var download_data = (DATA) => {
        Object.keys(DATA).forEach((modul) => {
          Object.entries(DATA[modul] || {}).forEach((entry) => {
            var key = entry[0];
            var value = entry[1];
            if (value != null) {
              if (typeof value == "string") {
      SEA.decrypt(value, SECRET, (data) => {
        output[modul][key] = data;
      });
              } else {
      output[modul][key] = value;
              }
            }
          });
          toastr.success("Exportado todo, descargando!");
          console.error(output);
          download(
            `Export TeleSec ${GROUPID}.json.txt`,
            JSON.stringify(output)
          );
          //setUrlHash(sel);
        }, 2500);
      };
      gun.get(TABLE).load(download_data);
    };
    document.getElementById(button_export_safe).onclick = () => {
      var download_data = (DATA) => {
        toastr.success("Exportado todo, descargado!");
        console.error(DATA);
        download(
          `Export TeleSec Encriptado ${GROUPID}.json.txt`,
          JSON.stringify(DATA)
        );
        //setUrlHash(sel);
      };
      gun.get(TABLE).load(download_data);
    };
    document.getElementById(button_export_safe_cloud).onclick = () => {
      var download_data = (DATA) => {
        toastr.info("Exportado todo, subiendo!");
        console.error(DATA);
        fetch(
            "https://telesec-sync.tech.eus/upload_backup.php?table=" + GROUPID,
            {
              method: "POST",
              body: JSON.stringify(DATA),
            }
          )
          .then(() => {
            toastr.success("Subido correctamente!");
          })
          .catch(() => {
            toastr.error("Ha ocurrido un error en la subida.");
          });
      };
      gun.get(TABLE).load(download_data);
    };
  },
  __import: function() {
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
        gun.get(TABLE).put(JSON.parse(val), (ack) => {
          toastr.info("Importado " + entry[0] + ".");
        });
      } else {
        Object.entries(JSON.parse(val)["data"]).forEach((entry) => {
          var enc = SEA.encrypt(entry[1], SECRET, (encrypted) => {
            betterGunPut(gun.get(TABLE).get(sel).get(entry[0]), encrypted);
          });
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
  index: function () {
    container.innerHTML = `
    <h1>Administración de datos</h1>
    <a class="button" href="#dataman,import">Importar datos</a>
    <a class="button" href="#dataman,export">Exportar datos</a>
    `
  }
};