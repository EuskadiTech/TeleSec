PAGES.index = {
  //navcss: "btn1",
  Title: 'Inicio',
  icon: 'static/appico/house.png',
  index: function () {
    var div_stats = safeuuid();

    container.innerHTML = html`
      <h1>¡Hola, ${SUB_LOGGED_IN_DETAILS.Nombre}!<br />Bienvenidx a %%TITLE%%</h1>
      <h2>
        Tienes ${parseFloat(SUB_LOGGED_IN_DETAILS.Monedero_Balance).toPrecision(2)} € en el
        monedero.
      </h2>
      <div
        id="${div_stats}"
        style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;"
      ></div>
      <em>Utiliza el menú superior para abrir un modulo</em>
      <br /><br />
      <button class="btn1" onclick="ActualizarProgramaTeleSec()">Actualizar programa</button>
      <button class="btn1" onclick="LogOutTeleSec()">Cerrar sesión</button>
    `;

    if (checkRole('pagos')) {
      var total_ingresos = safeuuid();
      var total_gastos = safeuuid();
      var balance_total = safeuuid();
      var total_ingresos_srcel = html`
        <div
          style="background: linear-gradient(135deg, #2ed573, #26d063); padding: 20px; border-radius: 10px; text-align: center; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
        >
          <span style="font-size: 16px;">Pagos</span><br>
          <h3 style="margin: 0;">Total Ingresos</h3>
          <div id="${total_ingresos}" style="font-size: 32px; font-weight: bold; margin-top: 10px;">
            0.00€
          </div>
        </div>
      `;
      var total_gastos_srcel = html`
        <div
          style="background: linear-gradient(135deg, #ff4757, #ff3838); padding: 20px; border-radius: 10px; text-align: center; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
        >
          <span style="font-size: 16px;">Pagos</span><br>
          <h3 style="margin: 0;">Total Gastos</h3>
          <div id="${total_gastos}" style="font-size: 32px; font-weight: bold; margin-top: 10px;">
            0.00€
          </div>
        </div>
      `;
      var balance_total_srcel = html`
        <div
          style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 20px; border-radius: 10px; text-align: center; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
        >
          <span style="font-size: 16px;">Pagos</span><br>
          <h3 style="margin: 0;">Balance Total</h3>
          <div id="${balance_total}" style="font-size: 32px; font-weight: bold; margin-top: 10px;">
            0.00€
          </div>
        </div>
      `;
      document.getElementById(div_stats).appendChild(createElementFromHTML(total_ingresos_srcel));
      document.getElementById(div_stats).appendChild(createElementFromHTML(total_gastos_srcel));
      document.getElementById(div_stats).appendChild(createElementFromHTML(balance_total_srcel));

      let totalData = {
        ingresos: {},
        gastos: {},
      };

      EventListeners.DB.push(
        DB.map('pagos', (data, key) => {
          function applyData(row) {
            if (!row || typeof row !== 'object') {
              delete totalData.ingresos[key];
              delete totalData.gastos[key];
            } else {
              const monto = parseFloat(row.Monto || 0) || 0;
              const tipo = row.Tipo;

              if (tipo === 'Ingreso') {
                if (row.Origen != 'Promo Bono') {
                  totalData.gastos[key] = 0;
                  totalData.ingresos[key] = monto;
                }
              } else if (tipo === 'Gasto') {
                totalData.ingresos[key] = 0;
                totalData.gastos[key] = monto;
              } else {
                totalData.ingresos[key] = 0;
                totalData.gastos[key] = 0;
              }
            }

            const totalIngresos = Object.values(totalData.ingresos).reduce((a, b) => a + b, 0);
            const totalGastos = Object.values(totalData.gastos).reduce((a, b) => a + b, 0);

            document.getElementById(total_ingresos).innerText = totalIngresos.toFixed(2) + '€';
            document.getElementById(total_gastos).innerText = totalGastos.toFixed(2) + '€';
          }

          if (typeof data == 'string') {
            TS_decrypt(data, SECRET, (decoded) => {
              applyData(decoded);
            });
          } else {
            applyData(data);
          }
        })
      );

      EventListeners.Interval.push(
        setInterval(() => {
          var balanceReal = 0;
          Object.values(SC_Personas).forEach((persona) => {
            balanceReal += parseFloat(persona.Monedero_Balance || 0);
          });
          document.getElementById(balance_total).innerText = balanceReal.toFixed(2) + '€';
          document.getElementById(balance_total).style.color =
            balanceReal >= 0 ? 'white' : '#ffcccc';
        }, 1000)
      );
    }

    if (checkRole('mensajes')) {
      var mensajes_sin_leer = safeuuid();
      var mensajes_sin_leer_srcel = html`
        <div
          style="background: linear-gradient(135deg, #66380d, #a5570d); padding: 20px; border-radius: 10px; text-align: center; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
        >
          <span style="font-size: 16px;">Mensajes</span><br>
          <h3 style="margin: 0;">Sin leer</h3>
          <div id="${mensajes_sin_leer}" style="font-size: 32px; font-weight: bold; margin-top: 10px;">
            0
          </div>
        </div>
      `;
      document.getElementById(div_stats).appendChild(createElementFromHTML(mensajes_sin_leer_srcel));

      var unreadById = {};

      EventListeners.DB.push(
        DB.map('mensajes', (data, key) => {
          function applyUnread(row) {
            if (!row || typeof row !== 'object') {
              delete unreadById[key];
            } else {
              var estado = String(row.Estado || '').trim().toLowerCase();
              var isRead = estado === 'leido' || estado === 'leído';
              unreadById[key] = isRead ? 0 : 1;
            }

            var totalUnread = Object.values(unreadById).reduce((a, b) => a + b, 0);
            document.getElementById(mensajes_sin_leer).innerText = String(totalUnread);
          }

          if (typeof data == 'string') {
            TS_decrypt(data, SECRET, (decoded) => {
              applyUnread(decoded);
            });
          } else {
            applyUnread(data);
          }
        })
      );
    }

    if (checkRole('supercafe')) {
      var comandas_en_deuda = safeuuid();
      var comandas_en_deuda_srcel = html`
        <div
          style="background: linear-gradient(135deg, #8e44ad, #6c3483); padding: 20px; border-radius: 10px; text-align: center; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
        >
          <span style="font-size: 16px;">SuperCafé</span><br>
          <h3 style="margin: 0;">Comandas en deuda</h3>
          <div id="${comandas_en_deuda}" style="font-size: 32px; font-weight: bold; margin-top: 10px;">
            0
          </div>
        </div>
      `;
      document.getElementById(div_stats).appendChild(createElementFromHTML(comandas_en_deuda_srcel));

      var deudaById = {};

      EventListeners.DB.push(
        DB.map('supercafe', (data, key) => {
          function applyDeuda(row) {
            if (!row || typeof row !== 'object') {
              delete deudaById[key];
            } else {
              var estado = String(row.Estado || '').trim().toLowerCase();
              deudaById[key] = estado === 'deuda' ? 1 : 0;
            }

            var totalDeuda = Object.values(deudaById).reduce((a, b) => a + b, 0);
            document.getElementById(comandas_en_deuda).innerText = String(totalDeuda);
          }

          if (typeof data == 'string') {
            TS_decrypt(data, SECRET, (decoded) => {
              applyDeuda(decoded);
            });
          } else {
            applyDeuda(data);
          }
        })
      );
    }

    if (checkRole('materiales')) {
      var materiales_comprar = safeuuid();
      var materiales_revisar = safeuuid();

      var materiales_comprar_srcel = html`
        <div
          style="background: linear-gradient(135deg, #e67e22, #d35400); padding: 20px; border-radius: 10px; text-align: center; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
        >
          <span style="font-size: 16px;">Almacén</span><br>
          <h3 style="margin: 0;">Por comprar</h3>
          <div id="${materiales_comprar}" style="font-size: 32px; font-weight: bold; margin-top: 10px;">
            0
          </div>
        </div>
      `;

      var materiales_revisar_srcel = html`
        <div
          style="background: linear-gradient(135deg, #2980b9, #1f6391); padding: 20px; border-radius: 10px; text-align: center; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
        >
          <span style="font-size: 16px;">Almacén</span><br>
          <h3 style="margin: 0;">Por revisar</h3>
          <div id="${materiales_revisar}" style="font-size: 32px; font-weight: bold; margin-top: 10px;">
            0
          </div>
        </div>
      `;

      document.getElementById(div_stats).appendChild(createElementFromHTML(materiales_comprar_srcel));
      document.getElementById(div_stats).appendChild(createElementFromHTML(materiales_revisar_srcel));

      var comprarById = {};
      var revisarById = {};

      EventListeners.DB.push(
        DB.map('materiales', (data, key) => {
          function applyMaterialStats(row) {
            if (!row || typeof row !== 'object') {
              delete comprarById[key];
              delete revisarById[key];
            } else {
              var cantidad = parseFloat(row.Cantidad);
              var cantidadMinima = parseFloat(row.Cantidad_Minima);
              var lowStock = !isNaN(cantidad) && !isNaN(cantidadMinima) && cantidad < cantidadMinima;
              comprarById[key] = lowStock ? 1 : 0;

              var revision = String(row.Revision || '?').trim();
              var needsReview = false;

              if (revision === '?' || revision === '' || revision === '-') {
                needsReview = true;
              } else {
                var match = revision.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (!match) {
                  needsReview = true;
                } else {
                  var y = parseInt(match[1], 10);
                  var m = parseInt(match[2], 10) - 1;
                  var d = parseInt(match[3], 10);
                  var revisionMs = Date.UTC(y, m, d);
                  var now = new Date();
                  var todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
                  var diffDays = Math.floor((todayMs - revisionMs) / 86400000);
                  needsReview = diffDays >= 90;
                }
              }

              revisarById[key] = needsReview ? 1 : 0;
            }

            var totalComprar = Object.values(comprarById).reduce((a, b) => a + b, 0);
            var totalRevisar = Object.values(revisarById).reduce((a, b) => a + b, 0);

            document.getElementById(materiales_comprar).innerText = String(totalComprar);
            document.getElementById(materiales_revisar).innerText = String(totalRevisar);
          }

          if (typeof data == 'string') {
            TS_decrypt(data, SECRET, (decoded) => {
              applyMaterialStats(decoded);
            });
          } else {
            applyMaterialStats(data);
          }
        })
      );
    }
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
