PAGES.index = {
  //navcss: "btn1",
  Title: "Inicio",
  index: function() {
    container.innerHTML = `
      <h1>¡Hola, ${SUB_LOGGED_IN_DETAILS.Nombre}!<br>Bienvenidx a %%TITLE%%</h1>
      <h2>Tienes ${parseFloat(SUB_LOGGED_IN_DETAILS.Monedero_Balance).toString()} € en el monedero.</h2>
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
    }
  },
  __scan: function(mid) {
    var qrscan = safeuuid()
    container.innerHTML = `
      <h1>Escanear Codigo QR</h1>
      <div style="max-width: 400px;" id="${qrscan}"></div>
      <br><br>`;
    var html5QrcodeScanner = new Html5QrcodeScanner(
      qrscan, { fps: 10, qrbox: 250 });
    
    function onScanSuccess(decodedText, decodedResult) {
      html5QrcodeScanner.clear();
      // Handle on success condition with the decoded text or result.
      // alert(`Scan result: ${decodedText}`, decodedResult);
      setUrlHash(decodedText)
      // ...
      
      // ^ this will stop the scanner (video feed) and clear the scan area.
      
    }
    
    html5QrcodeScanner.render(onScanSuccess);
    EventListeners.QRScanner.push(html5QrcodeScanner)
  }
}