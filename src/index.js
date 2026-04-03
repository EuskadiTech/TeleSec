PAGES.index = {
  //navcss: "btn1",
  Title: 'Inicio',
  faicon: 'fas fa-home',
  icon: 'static/appico/house.png',
  index: function () {
    var div_stats = safeuuid();
    var img_avatar = safeuuid();
    var is_pagos_cargado = false;
    if (PAGES.pagos) {
      is_pagos_cargado = true;
    }
    container.innerHTML = html`
      <h2>¡Bienvenidx a Axia4!</h2>
      <!-- Card con el avatar del usuario con su nombre y su saldo -->
      <div class="card card-outline card-primary ts-index-card" style="max-width: 520px;">
        <div class="card-body box-profile" style="display: flex; align-items: center; gap: 20px;">
          <div style="flex: 0 0 auto;">
            <img id="${img_avatar}" class="img-fluid" style="margin: 0; width: 96px; height: 96px; object-fit: cover;" src="${SUB_LOGGED_IN_DETAILS.Foto || 'static/ico/user_generic.png'}" alt="User profile picture">
          </div>
          <div style="flex: 1 1 auto; min-width: 0;">
            <h3 class="profile-username" style="text-align: left; margin-bottom: 8px;">${SUB_LOGGED_IN_DETAILS.Nombre}</h3>
            ${is_pagos_cargado ? `<p class="text-muted" style="text-align: left; margin-bottom: 0;">Saldo: ${SUB_LOGGED_IN_DETAILS.Monedero_Balance}€</p>` : ''}
          </div>
        </div>
      </div>

      <em>Utiliza el menú superior para abrir un modulo</em>
      <br /><br />
      <button class="btn1" onclick="ActualizarProgramaTeleSec()">Actualizar programa</button>
      <button class="btn1" onclick="LogOutTeleSec()">Cerrar sesión</button>
    `;
    DB.getAttachment('personas', SUB_LOGGED_IN, 'Foto').then((foto) => {
      if (foto) {
        document.getElementById(img_avatar).src = foto;
      }
    });
  },
  edit: function (mid) {
    switch (mid) {
      case 'qr':
        PAGES.index.__scan();
        break;
    }
  },
  __scan: function (mid) {
    var qrscan = safeuuid();
    container.innerHTML = html` <h1>Escanear Codigo QR</h1>
      <div style="max-width: 400px;" id="${qrscan}"></div>
      <br /><br />`;
    var html5QrcodeScanner = new Html5QrcodeScanner(qrscan, { fps: 10, qrbox: 250 });

    function onScanSuccess(decodedText, decodedResult) {
      html5QrcodeScanner.clear();
      // Handle on success condition with the decoded text or result.
      // alert(`Scan result: ${decodedText}`, decodedResult);
      setUrlHash(decodedText);
      // ...

      // ^ this will stop the scanner (video feed) and clear the scan area.
    }

    html5QrcodeScanner.render(onScanSuccess);
    EventListeners.QRScanner.push(html5QrcodeScanner);
  },
};
