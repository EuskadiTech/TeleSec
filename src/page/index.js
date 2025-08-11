PAGES.index = {
  //navcss: "btn1",
  Title: "Inicio",
  index: function() {
    container.innerHTML = `
                <h1>¡Hola, ${SUB_LOGGED_IN_DETAILS.Nombre}!</h1>
                <em>Utiliza el menú superior para abrir un modulo</em>
                <br><br>
                <button class="btn1" onclick="LogOutTeleSec()">Cerrar sesión</button>
            `;
  },
  edit: function(mid) {
    var qrscan = safeuuid()
    container.innerHTML = `
      <h1>Buscar con Aztec</h1>
      <div id="${qrscan}"></div>
      <br><br>`;
    const html5QrCode = new Html5Qrcode(
      qrscan, { formatsToSupport: [Html5QrcodeSupportedFormats.AZTEC] });
    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
      /* handle success */
      alert(decodedText)
      html5QrCode.stop()
    };
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    // If you want to prefer front camera
    html5QrCode.start({ facingMode: "user" }, config, qrCodeSuccessCallback);
  }
};