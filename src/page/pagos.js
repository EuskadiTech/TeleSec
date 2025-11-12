PERMS["pagos"] = "Pagos";
PERMS["pagos:edit"] = "&gt; Editar";
PAGES.pagos = {
  navcss: "btn7",
  icon: "static/appico/Database.svg",
  AccessControl: true,
  Title: "Pagos",
  
  // Datafono view for creating/processing transactions
  datafono: function (prefilledData = {}) {
    if (!checkRole("pagos:edit")) {
      setUrlHash("pagos");
      return;
    }
    
    // Check for prefilled data from SuperCafé
    var prefilledStr = sessionStorage.getItem('pagos_prefill');
    if (prefilledStr) {
      try {
        var prefilled = JSON.parse(prefilledStr);
        prefilledData = { ...prefilled, ...prefilledData };
        sessionStorage.removeItem('pagos_prefill');
      } catch (e) {
        console.error("Error parsing prefilled data:", e);
      }
    }
    
    var field_tipo = safeuuid();
    var field_monto = safeuuid();
    var field_persona = safeuuid();
    var field_persona_destino = safeuuid();
    var field_metodo = safeuuid();
    var field_notas = safeuuid();
    var numpad_display = safeuuid();
    var numpad_container = safeuuid();
    var div_persona_destino = safeuuid();
    var btn_confirm = safeuuid();
    var btn_correct = safeuuid();
    var btn_cancel = safeuuid();
    var scan_qr_btn = safeuuid();
    var currentStep = 1;
    var selectedPersona = prefilledData.persona || "";
    var selectedPersonaDestino = "";
    
    container.innerHTML = `
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <h1 style="color: white; text-align: center; margin-bottom: 20px;">
          💳 DATAFONO / TERMINAL DE PAGO
        </h1>
        
        <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="text-align: center; color: #333; margin-top: 0;">Paso <span id="stepIndicator">1</span> de 2</h2>
          
          <!-- Step 1: Retailer Input -->
          <div id="step1">
            <fieldset style="border: 2px solid #667eea; border-radius: 8px; padding: 15px;">
              <legend style="color: #667eea; font-weight: bold;">1. Información de Transacción</legend>
              
              <label style="display: block; margin-bottom: 15px;">
                <b>Tipo de Transacción:</b><br>
                <select id="${field_tipo}" style="width: 100%; padding: 10px; font-size: 16px; border: 2px solid #ddd; border-radius: 5px;">
                  <option value="Ingreso">💵 Ingreso (Depósito)</option>
                  <option value="Gasto">💸 Gasto (Retiro/Pago)</option>
                  <option value="Transferencia">🔄 Transferencia</option>
                </select>
              </label>
              
              <label style="display: block; margin-bottom: 15px;">
                <b>Método de Pago:</b><br>
                <select id="${field_metodo}" style="width: 100%; padding: 10px; font-size: 16px; border: 2px solid #ddd; border-radius: 5px;">
                  <option value="Efectivo">💵 Efectivo</option>
                  <option value="Tarjeta">💳 Tarjeta Monedero</option>
                  <option value="Transferencia">🏦 Transferencia Bancaria</option>
                  <option value="Otro">❓ Otro</option>
                </select>
              </label>
              
              <label style="display: block; margin-bottom: 15px;">
                <b>Monto:</b><br>
                <input type="number" id="${numpad_display}" 
                  style="width: calc(100% - 24px); padding: 15px; font-size: 32px; text-align: right; 
                  border: 3px solid #667eea; border-radius: 5px; font-weight: bold;"
                  value="0.00">
              </label>
              
              <label style="display: block; margin-bottom: 15px;">
                <b>Notas:</b><br>
                <textarea id="${field_notas}" rows="3" 
                  style="width: calc(100% - 24px); padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 5px;"
                  placeholder="Notas adicionales..."></textarea>
              </label>
            </fieldset>
          </div>
          
          <!-- Step 2: Client Confirmation -->
          <div id="step2" style="display: none;">
            <fieldset style="border: 2px solid #667eea; border-radius: 8px; padding: 15px;">
              <legend style="color: #667eea; font-weight: bold;">2. Confirmación del Cliente</legend>
              
              <div style="text-align: center; margin-bottom: 20px;">
                <h3 style="color: #333;">Monto a Pagar:</h3>
                <div style="font-size: 48px; font-weight: bold; color: #667eea; margin: 10px 0;" id="confirmAmount">0.00€</div>
              </div>
              
              <div style="margin-bottom: 15px;">
                <b>Selecciona tu Monedero:</b>
                <input type="hidden" id="${field_persona}">
                <div id="personaSelector"></div>
                <button id="${scan_qr_btn}" style="width: 100%; padding: 15px; margin-top: 10px; 
                  background: #667eea; color: white; border: none; border-radius: 8px; 
                  font-size: 18px; cursor: pointer; font-weight: bold;">
                  📷 Escanear QR de Monedero
                </button>
              </div>
              
              <div id="${div_persona_destino}" style="display: none; margin-top: 15px;">
                <b>Monedero Destino:</b>
                <input type="hidden" id="${field_persona_destino}">
                <div id="personaDestinoSelector"></div>
              </div>
            </fieldset>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          <button id="${btn_cancel}" style="padding: 20px; font-size: 18px; font-weight: bold; 
            background: #ff4757; color: white; border: none; border-radius: 8px; cursor: pointer;">
            ❌ CANCELAR
          </button>
          <button id="${btn_confirm}" style="padding: 20px; font-size: 18px; font-weight: bold; 
            background: #2ed573; color: white; border: none; border-radius: 8px; cursor: pointer;">
            ✅ CONFIRMAR
          </button>
        </div>
      </div>
    `;
    
    // Tipo change handler
    document.getElementById(field_tipo).addEventListener('change', function() {
      var tipo = this.value;
      var divDestino = document.getElementById(div_persona_destino);
      if (tipo === 'Transferencia') {
        divDestino.style.display = 'block';
      } else {
        divDestino.style.display = 'none';
      }
    });
    
    // Confirm button
    document.getElementById(btn_confirm).onclick = () => {
      if (currentStep === 1) {
        // Move to step 2
        var monto = parseFloat(document.getElementById(numpad_display).value);
        if (isNaN(monto) || monto <= 0) {
          alert("Por favor ingresa un monto válido");
          return;
        }
        
        document.getElementById('step1').style.display = 'none';
        document.getElementById('step2').style.display = 'block';
        document.getElementById('stepIndicator').innerText = '2';
        document.getElementById('confirmAmount').innerText = monto.toFixed(2) + '€';
        currentStep = 2;
        
        // Load personas for selection
        loadPersonaSelector();
        if (document.getElementById(field_tipo).value === 'Transferencia') {
          loadPersonaDestinoSelector();
        }
      } else {
        // Process transaction
        processTransaction();
      }
    };
    
    
    // Cancel button
    document.getElementById(btn_cancel).onclick = () => {
      if (confirm("¿Seguro que quieres cancelar esta transacción?")) {
        setUrlHash("pagos");
      }
    };
    
    // QR Scanner button
    document.getElementById(scan_qr_btn).onclick = () => {
      setUrlHash("pagos,scan_qr");
    };
    
    function loadPersonaSelector() {
      var container = document.querySelector('#personaSelector');
      container.innerHTML = '';
      addCategory_Personas(
        container,
        SC_Personas,
        selectedPersona,
        (personaId) => {
          document.getElementById(field_persona).value = personaId;
          selectedPersona = personaId;
        },
        "Monedero",
        false,
        "- No hay personas registradas -"
      );
    }
    
    function loadPersonaDestinoSelector() {
      var container = document.querySelector('#personaDestinoSelector');
      container.innerHTML = '';
      addCategory_Personas(
        container,
        SC_Personas,
        selectedPersonaDestino,
        (personaId) => {
          document.getElementById(field_persona_destino).value = personaId;
          selectedPersonaDestino = personaId;
        },
        "Monedero Destino",
        false,
        "- No hay personas registradas -"
      );
    }
    
    function processTransaction() {
      var tipo = document.getElementById(field_tipo).value;
      var monto = parseFloat(document.getElementById(numpad_display).value);
      var personaId = document.getElementById(field_persona).value;
      var metodo = document.getElementById(field_metodo).value;
      var notas = document.getElementById(field_notas).value;
      
      if (!personaId) {
        alert("Por favor selecciona un monedero");
        return;
      }
      
      if (tipo === 'Transferencia') {
        var personaDestinoId = document.getElementById(field_persona_destino).value;
        if (!personaDestinoId) {
          alert("Por favor selecciona el monedero destino");
          return;
        }
        if (personaId === personaDestinoId) {
          alert("No puedes transferir al mismo monedero");
          return;
        }
      }
      
      // Check if persona has enough balance for Gasto or Transferencia
      if (tipo === 'Gasto' || tipo === 'Transferencia') {
        var persona = SC_Personas[personaId];
        var currentBalance = parseFloat(persona.Monedero_Balance || 0);
        if (currentBalance < monto) {
          if (!confirm(`Saldo insuficiente (${currentBalance.toFixed(2)}€). ¿Continuar de todos modos?`)) {
            return;
          }
        }
      }
      
      // Create transaction
      var ticketId = safeuuid("");
      var transactionData = {
        Ticket: ticketId,
        Fecha: CurrentISOTime(),
        Tipo: tipo,
        Monto: monto,
        Persona: personaId,
        Metodo: metodo,
        Notas: notas,
        Estado: "Completado"
      };
      
      if (tipo === 'Transferencia') {
        transactionData.PersonaDestino = document.getElementById(field_persona_destino).value;
      }
      
      // Add prefilled data if exists
      if (prefilledData.origen) {
        transactionData.Origen = prefilledData.origen;
      }
      if (prefilledData.origen_id) {
        transactionData.OrigenID = prefilledData.origen_id;
      }
      
      // Update wallet balances
      updateWalletBalance(personaId, tipo, monto, () => {
        if (tipo === 'Transferencia') {
          var destinoId = transactionData.PersonaDestino;
          updateWalletBalance(destinoId, 'Ingreso', monto, () => {
            saveTransaction(ticketId, transactionData);
          });
        } else {
          saveTransaction(ticketId, transactionData);
        }
      });
    }
    
    function updateWalletBalance(personaId, tipo, monto, callback) {
      var persona = SC_Personas[personaId];
      if (!persona) {
        alert("Error: Persona no encontrada");
        return;
      }
      
      var currentBalance = parseFloat(persona.Monedero_Balance || 0);
      var newBalance = currentBalance;
      
      if (tipo === 'Ingreso') {
        newBalance = currentBalance + monto;
      } else if (tipo === 'Gasto' || tipo === 'Transferencia') {
        newBalance = currentBalance - monto;
      }
      
      persona.Monedero_Balance = newBalance;
      
      TS_encrypt(persona, SECRET, (encrypted) => {
        betterGunPut(gun.get(TABLE).get("personas").get(personaId), encrypted);
        if (callback) callback();
      });
    }
    
    function saveTransaction(ticketId, data) {
      TS_encrypt(data, SECRET, (encrypted) => {
        document.getElementById("actionStatus").style.display = "block";
        betterGunPut(gun.get(TABLE).get("pagos").get(ticketId), encrypted);
        
        // If this is from SuperCafé, update the order
        if (data.Origen === 'SuperCafé' && data.OrigenID) {
          handleSuperCafePayment(data);
        }
        
        toastr.success("¡Transacción completada!");
        setTimeout(() => {
          document.getElementById("actionStatus").style.display = "none";
          setUrlHash("pagos," + ticketId);
        }, 1500);
      });
    }
    
    function handleSuperCafePayment(transactionData) {
      // Mark the SuperCafé order as paid and delete it
      betterGunPut(gun.get(TABLE).get("supercafe").get(transactionData.OrigenID), null);
      
      // Update persona points
      var persona = SC_Personas[transactionData.Persona];
      if (!persona) return;
      
      // Check if paying with points or adding points
      if (persona.Puntos >= 10) {
        if (confirm("¿Pagar con Puntos? (10 puntos) - Cancela para pagar con dinero y ganar 1 punto.")) {
          persona.Puntos = parseInt(persona.Puntos) - 10;
          toastr.success("¡Comanda gratis para " + persona.Nombre + "!");
        } else {
          persona.Puntos = parseInt(persona.Puntos) + 1;
          toastr.success("¡Comanda de pago! +1 punto");
        }
      } else {
        persona.Puntos = parseInt(persona.Puntos) + 1;
        toastr.success("¡Comanda de pago! +1 punto");
      }
      
      TS_encrypt(persona, SECRET, (encrypted) => {
        betterGunPut(gun.get(TABLE).get("personas").get(transactionData.Persona), encrypted);
      });
    }
    
    // Pre-fill if data provided
    if (prefilledData.monto) {
      displayValue = prefilledData.monto.toString();
      displayEl.value = displayValue;
    }
    if (prefilledData.tipo) {
      document.getElementById(field_tipo).value = prefilledData.tipo;
    }
    if (prefilledData.notas) {
      document.getElementById(field_notas).value = prefilledData.notas;
    }
  },
  
  // Edit/view transaction
  edit: function (tid) {
    if (!checkRole("pagos")) {
      setUrlHash("pagos");
      return;
    }
    var tid2 = location.hash.split(",")
    if (tid == "datafono") {
      PAGES.pagos.datafono()
      return
    }
    if (tid == "datafono_prefill") {
      PAGES.pagos.datafono(JSON.parse(atob(tid2[2])))
      return
    }
    
    var nameh1 = safeuuid();
    var field_ticket = safeuuid();
    var field_fecha = safeuuid();
    var field_tipo = safeuuid();
    var field_monto = safeuuid();
    var field_persona = safeuuid();
    var field_persona_destino = safeuuid();
    var field_metodo = safeuuid();
    var field_notas = safeuuid();
    var field_estado = safeuuid();
    var field_origen = safeuuid();
    var div_persona_destino = safeuuid();
    var div_origen = safeuuid();
    var btn_volver = safeuuid();
    
    container.innerHTML = `
      <h1>Transacción <code id="${nameh1}"></code></h1>
      ${BuildQR("pagos," + tid, "Esta Transacción")}
      <button id="${btn_volver}">← Volver a Pagos</button>
      <fieldset>
        <legend>Detalles de la Transacción</legend>
        
        <label>
          Ticket/ID<br>
          <input type="text" id="${field_ticket}" readonly style="background: #f0f0f0;"><br><br>
        </label>
        
        <label>
          Fecha y Hora<br>
          <input type="text" id="${field_fecha}" readonly style="background: #f0f0f0;"><br><br>
        </label>
        
        <label>
          Tipo<br>
          <input type="text" id="${field_tipo}" readonly style="background: #f0f0f0;"><br><br>
        </label>
        
        <label>
          Monto<br>
          <input type="text" id="${field_monto}" readonly style="background: #f0f0f0; font-size: 24px; font-weight: bold;"><br><br>
        </label>
        
        <label>
          Monedero (Persona)<br>
          <input type="text" id="${field_persona}" readonly style="background: #f0f0f0;"><br><br>
        </label>
        
        <div id="${div_persona_destino}" style="display: none;">
          <label>
            Monedero Destino<br>
            <input type="text" id="${field_persona_destino}" readonly style="background: #f0f0f0;"><br><br>
          </label>
        </div>
        
        <label>
          Método de Pago<br>
          <input type="text" id="${field_metodo}" readonly style="background: #f0f0f0;"><br><br>
        </label>
        
        <label>
          Estado<br>
          <input type="text" id="${field_estado}" readonly style="background: #f0f0f0;"><br><br>
        </label>
        
        <div id="${div_origen}" style="display: none;">
          <label>
            Origen<br>
            <input type="text" id="${field_origen}" readonly style="background: #f0f0f0;"><br><br>
          </label>
        </div>
        
        <label>
          Notas<br>
          <textarea id="${field_notas}" readonly rows="4" style="background: #f0f0f0;"></textarea><br><br>
        </label>
      </fieldset>
    `;
    
    document.getElementById(btn_volver).onclick = () => {
      setUrlHash("pagos");
    };
    
    gun.get(TABLE).get("pagos").get(tid).once((data, key) => {
      function load_data(data) {
        document.getElementById(nameh1).innerText = key;
        document.getElementById(field_ticket).value = data.Ticket || key;
        
        var fecha = data.Fecha || "";
        if (fecha) {
          var d = new Date(fecha);
          document.getElementById(field_fecha).value = d.toLocaleString('es-ES');
        }
        
        document.getElementById(field_tipo).value = data.Tipo || "";
        document.getElementById(field_monto).value = (data.Monto || 0).toFixed(2) + "€";
        
        var persona = SC_Personas[data.Persona] || {};
        document.getElementById(field_persona).value = persona.Nombre || data.Persona || "";
        
        if (data.PersonaDestino) {
          var personaDestino = SC_Personas[data.PersonaDestino] || {};
          document.getElementById(field_persona_destino).value = personaDestino.Nombre || data.PersonaDestino || "";
          document.getElementById(div_persona_destino).style.display = 'block';
        }
        
        document.getElementById(field_metodo).value = data.Metodo || "";
        document.getElementById(field_estado).value = data.Estado || "";
        document.getElementById(field_notas).value = data.Notas || "";
        
        if (data.Origen) {
          document.getElementById(field_origen).value = data.Origen + (data.OrigenID ? " (" + data.OrigenID + ")" : "");
          document.getElementById(div_origen).style.display = 'block';
        }
      }
      
      if (typeof data == "string") {
        TS_decrypt(data, SECRET, load_data);
      } else {
        load_data(data || {});
      }
    });
  },
  
  // Main index view with transaction log
  index: function () {
    if (!checkRole("pagos")) {
      setUrlHash("index");
      return;
    }
    
    var btn_new = safeuuid();
    var btn_datafono = safeuuid();
    var total_ingresos = safeuuid();
    var total_gastos = safeuuid();
    var balance_total = safeuuid();
    
    container.innerHTML = `
      <h1>💳 Pagos y Transacciones</h1>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
        <div style="background: linear-gradient(135deg, #2ed573, #26d063); padding: 20px; border-radius: 10px; text-align: center; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h3 style="margin: 0;">Total Ingresos</h3>
          <div id="${total_ingresos}" style="font-size: 32px; font-weight: bold; margin-top: 10px;">0.00€</div>
        </div>
        <div style="background: linear-gradient(135deg, #ff4757, #ff3838); padding: 20px; border-radius: 10px; text-align: center; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h3 style="margin: 0;">Total Gastos</h3>
          <div id="${total_gastos}" style="font-size: 32px; font-weight: bold; margin-top: 10px;">0.00€</div>
        </div>
        <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 20px; border-radius: 10px; text-align: center; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h3 style="margin: 0;">Balance Total</h3>
          <div id="${balance_total}" style="font-size: 32px; font-weight: bold; margin-top: 10px;">0.00€</div>
        </div>
      </div>
      
      <button id="${btn_datafono}" class="btn5" style="font-size: 18px; padding: 15px 30px;">
        💳 Abrir Datafono
      </button>
      <button id="${btn_new}" style="font-size: 18px; padding: 15px 30px;">
        ➕ Nueva Transacción Manual
      </button>
      
      <h2>Registro de Transacciones</h2>
      <div id="tableContainer"></div>
    `;
    
    var totals = { ingresos: 0, gastos: 0 };
    
    const config = [
      {
        key: "Fecha",
        label: "Fecha/Hora",
        type: "template",
        template: (data, element) => {
          if (data.Fecha) {
            var d = new Date(data.Fecha);
            element.innerText = d.toLocaleString('es-ES');
          }
        },
        default: ""
      },
      {
        key: "Tipo",
        label: "Tipo",
        type: "template",
        template: (data, element) => {
          var tipo = data.Tipo || "";
          var icon = "";
          var color = "";
          
          if (tipo === "Ingreso") {
            icon = "💵";
            color = "#2ed573";
          } else if (tipo === "Gasto") {
            icon = "💸";
            color = "#ff4757";
          } else if (tipo === "Transferencia") {
            icon = "🔄";
            color = "#667eea";
          }
          
          element.innerHTML = `<span style="background: ${color}; color: white; padding: 5px 10px; border-radius: 5px; font-weight: bold;">${icon} ${tipo}</span>`;
        },
        default: ""
      },
      {
        key: "Monto",
        label: "Monto",
        type: "template",
        template: (data, element) => {
          var monto = parseFloat(data.Monto || 0);
          var color = data.Tipo === "Ingreso" ? "#2ed573" : "#ff4757";
          element.innerHTML = `<span style="font-size: 20px; font-weight: bold; color: ${color};">${monto.toFixed(2)}€</span>`;
        },
        default: "0.00€"
      },
      {
        key: "Persona",
        label: "Monedero",
        type: "persona",
        default: ""
      },
      {
        key: "Metodo",
        label: "Método",
        type: "text",
        default: ""
      },
      {
        key: "Estado",
        label: "Estado",
        type: "template",
        template: (data, element) => {
          var estado = data.Estado || "Pendiente";
          var color = estado === "Completado" ? "#2ed573" : "#ffa502";
          element.innerHTML = `<span style="background: ${color}; color: white; padding: 5px 10px; border-radius: 5px;">${estado}</span>`;
        },
        default: "Pendiente"
      }
    ];
    
    TS_IndexElement(
      "pagos",
      config,
      gun.get(TABLE).get("pagos"),
      document.getElementById("tableContainer"),
      (data, new_tr) => {
        // Calculate totals
        var monto = parseFloat(data.Monto || 0);
        if (data.Tipo === "Ingreso") {
          totals.ingresos += monto;
        } else if (data.Tipo === "Gasto") {
          totals.gastos += monto;
        }
        
        // Update totals display
        document.getElementById(total_ingresos).innerText = totals.ingresos.toFixed(2) + "€";
        document.getElementById(total_gastos).innerText = totals.gastos.toFixed(2) + "€";
        var balance = totals.ingresos - totals.gastos;
        document.getElementById(balance_total).innerText = balance.toFixed(2) + "€";
        document.getElementById(balance_total).style.color = balance >= 0 ? "white" : "#ffcccc";
      }
    );
    
    document.getElementById(btn_datafono).onclick = () => {
      setUrlHash("pagos,datafono");
    };
    
    if (!checkRole("pagos:edit")) {
      document.getElementById(btn_new).style.display = "none";
      document.getElementById(btn_datafono).style.display = "none";
    } else {
      document.getElementById(btn_new).onclick = () => {
        setUrlHash("pagos," + safeuuid(""));
      };
    }
  }
};
