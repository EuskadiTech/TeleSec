PAGES.importar = {
  navcss: "btn1",
  Title: "Importar",
  index: function () {
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
};
