PAGES.index = {
  //navcss: "btn1",
  Title: "Inicio",
  index: function() {
    container.innerHTML = `
      <h1>¡Hola, ${SUB_LOGGED_IN_DETAILS.Nombre}!<br>Bienvenidx a %%TITLE%%</h1>
      <em>Utiliza el menú superior para abrir un modulo</em>
      <br><br>
      <button class="btn1" onclick="LogOutTeleSec()">Cerrar sesión</button>
            `;
  },
  edit: function(mid) {
    switch (mid) {
      case 'qr':
        PAGES.index.__scan()
        break;
      case "labels":
        PAGES.index.__labels()
    }
  },
  __scan: function(mid) {
    var qrscan = safeuuid()
    container.innerHTML = `
      <h1>Escanear Codigo Aztec/QR</h1>
      <div id="${qrscan}"></div>
      <br><br>`;
    var html5QrcodeScanner = new Html5QrcodeScanner(
      qrscan, { fps: 10, qrbox: 250 });
    
    function onScanSuccess(decodedText, decodedResult) {
      // Handle on success condition with the decoded text or result.
      // alert(`Scan result: ${decodedText}`, decodedResult);
      setUrlHash(decodedText)
      // ...
      html5QrcodeScanner.clear();
      // ^ this will stop the scanner (video feed) and clear the scan area.
      
    }
    
    html5QrcodeScanner.render(onScanSuccess);
  },
  __labels: function(mid) {
    var div_materiales = safeuuid()
    container.innerHTML = `
      <h1>Imprimir Etiquetas AztecQR</h1>
      <button onclick="print()">Imprimir</button>
      <h2>Materiales</h2>
      <div id="${div_co}"></div>
      <br><br>`;
    div_materiales = document.getElementById(div_materiales)
    gun.get(TABLE).get("materiales").once().map().once((data, mid) => {
      function add_row(data, key) {
        if (data != null) {
          div_materiales.innerHTML += BuildQR("materiales," + mid, data["Nombre"] || mid)
        }
      }
      if (typeof data == "string") {
        SEA.decrypt(data, SECRET, (data) => {
          add_row(data, key);
        });
      } else {
        add_row(data, key);
      }
    })
  }
}