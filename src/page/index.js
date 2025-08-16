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
    var qrscan = safeuuid()
    container.innerHTML = `
      <h1>Escanear QR</h1>
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
  }
}