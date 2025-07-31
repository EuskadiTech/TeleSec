PAGES.exportar = {
  navcss: "btn1",
  Title: "Exportar",
  index: function () {
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
};
