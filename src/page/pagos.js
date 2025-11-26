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
    
    // Check for scanned persona from QR scanner
    var scannedPersona = sessionStorage.getItem('pagos_scanned_persona');
    if (scannedPersona) {
      prefilledData.persona = scannedPersona;
      sessionStorage.removeItem('pagos_scanned_persona');
    }
    
    var field_tipo = safeuuid();
    var field_monto = safeuuid();
    var field_persona = safeuuid();
    var field_persona_destino = safeuuid();
    var field_metodo = safeuuid();
    var field_notas = safeuuid();
    var numpad_display = safeuuid();
    var div_persona_destino = safeuuid();
    var btn_confirm = safeuuid();
    var btn_back = safeuuid();
    var btn_cancel = safeuuid();
    var scan_qr_btn = safeuuid();
    var currentStep = 1;
    var selectedPersona = prefilledData.persona || "";
    var selectedPersonaDestino = "";
    
    container.innerHTML = `
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <h1 style="color: white; text-align: center; margin-bottom: 20px;">
          Terminal de pago TeleSec
        </h1>
        
        <div style="margin: 0 auto;max-width: 435px;background: white;padding: 20px;border-radius: 10px;margin-bottom: 20px;">
          <h2 style="text-align: center; color: #333; margin-top: 0;">Paso <span id="stepIndicator">1</span> de 3</h2>
          
          <!-- Step 1: Retailer Input -->
          <div id="step1">
            <fieldset style="border: 2px solid #667eea; border-radius: 8px; padding: 15px;">
              <legend style="color: #667eea; font-weight: bold;">1. Información de Transacción</legend>
              
              <label style="display: block; margin-bottom: 15px;">
                <b>Tipo de Transacción:</b><br>
                <select id="${field_tipo}" style="background: #fff; width: 100%; padding: 10px; font-size: 16px; border: 2px solid #ddd; border-radius: 5px;">
                  <option value="">-- operación --</option>
                  <option value="Ingreso">➕ Ingreso (Depósito)</option>
                  <option value="Gasto">➖ Gasto (Retiro/Pago)</option>
                  <option value="Transferencia">🔄 Transferencia</option>
                </select>
              </label>
              
              <label style="display: block; margin-bottom: 15px;">
                <b>Método de Pago:</b><br>
                <select id="${field_metodo}" style="background: #fff; width: 100%; padding: 10px; font-size: 16px; border: 2px solid #ddd; border-radius: 5px;">
                  <option value="">-- método --</option>
                  <option value="Efectivo">💵 Efectivo</option>
                  <option value="Tarjeta">💳 Tarjeta Monedero</option>
                  <option value="Otro">❓ Otro</option>
                </select>
              </label>
              
              <label style="display: block; margin-bottom: 15px;">
                <b>Monto:</b><br>
                <input type="number" id="${numpad_display}" step="0.01" min="0"
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
          
          <!-- Step 2: Monedero Selection -->
          <div id="step2" style="display: none;">
            <fieldset style="border: 2px solid #667eea; border-radius: 8px; padding: 15px;">
              <legend style="color: #667eea; font-weight: bold;">2. Seleccionar Monedero</legend>
              
              <div style="text-align: center; margin-bottom: 20px;">
                <h3 style="color: #333;">Monto:</h3>
                <div style="font-size: 48px; font-weight: bold; color: #667eea; margin: 10px 0;" id="step2Amount">0.00€</div>
              </div>
              
              <div style="margin-bottom: 15px;">
                <b>Selecciona el Monedero:</b>
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
          
          <!-- Step 3: Client Confirmation -->
          <div id="step3" style="display: none;">
            <fieldset style="border: 2px solid #667eea; border-radius: 8px; padding: 15px;">
              <legend style="color: #667eea; font-weight: bold;">3. Confirmación del Cliente</legend>
              
              <div style="text-align: center; margin-bottom: 20px;">
                <h3 style="color: #333;">Confirmar Transacción</h3>
                <div style="font-size: 48px; font-weight: bold; color: #667eea; margin: 10px 0;" id="confirmAmount">0.00€</div>
              </div>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <div style="margin-bottom: 10px;">
                  <b>Tipo:</b> <span id="confirmTipo"></span>
                </div>
                <div style="margin-bottom: 10px;">
                  <b>Método:</b> <span id="confirmMetodo"></span>
                </div>
                <div style="margin-bottom: 10px;">
                  <b>Monedero:</b> <span id="confirmPersona"></span>
                </div>
                <div id="confirmPersonaDestino" style="margin-bottom: 10px; display: none;">
                  <b>Monedero Destino:</b> <span id="confirmPersonaDestinoName"></span>
                </div>
                <div style="margin-bottom: 10px;">
                  <b>Notas:</b> <span id="confirmNotas"></span>
                </div>
              </div>
              
              <div style="text-align: center; padding: 20px; background: #fff3cd; border-radius: 8px; border: 2px solid #ffc107;">
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #856404;">
                  ⚠️ Cliente: Verifica los datos antes de confirmar
                </p>
              </div>
            </fieldset>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div id="buttonContainer" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          <button id="${btn_cancel}" style="padding: 20px; font-size: 18px; font-weight: bold; 
            background: #ff4757; color: white; border: none; border-radius: 8px; cursor: pointer;">
            ✖️ CANCELAR
          </button>
          <button id="${btn_confirm}" style="padding: 20px; font-size: 18px; font-weight: bold; 
            background: #2ed573; color: white; border: none; border-radius: 8px; cursor: pointer;">
            → SIGUIENTE
          </button>
        </div>
        <div id="buttonContainerFinal" style="display: none; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          <button id="${btn_back}" style="padding: 20px; font-size: 18px; font-weight: bold; 
            background: #ffa502; color: white; border: none; border-radius: 8px; cursor: pointer;">
            ← ATRÁS
          </button>
          <button id="${btn_confirm}2" style="padding: 20px; font-size: 18px; font-weight: bold; 
            background: #2ed573; color: white; border: none; border-radius: 8px; cursor: pointer;">
            ✔️ CONFIRMAR
          </button>
        </div>
      </div>
    `;
    
    // Tipo change handler
    document.getElementById(field_tipo).addEventListener('change', function() {
      var tipo = this.value;
      var divDestino = document.getElementById(div_persona_destino);
      var metodoSelect = document.getElementById(field_metodo);
      
      if (tipo === 'Transferencia') {
        divDestino.style.display = 'block';
      } else {
        divDestino.style.display = 'none';
      }
      
      // Restrict Ingreso to Efectivo only
      if (tipo === 'Ingreso') {
        metodoSelect.value = 'Efectivo';
        metodoSelect.disabled = true;
      } else {
        metodoSelect.disabled = false;
      }
    });
    
    // Confirm/Next button
    document.getElementById(btn_confirm).onclick = () => {
      if (currentStep === 1) {
        // Validate step 1
        var tipo = document.getElementById(field_tipo).value;
        var metodo = document.getElementById(field_metodo).value;
        var monto = parseFloat(document.getElementById(numpad_display).value);
        
        if (!tipo) {
          alert("Por favor selecciona el tipo de transacción");
          return;
        }
        if (!metodo) {
          alert("Por favor selecciona el método de pago");
          return;
        }
        if (tipo === 'Ingreso' && metodo !== 'Efectivo') {
          alert("Los ingresos solo pueden ser en Efectivo");
          return;
        }
        if (isNaN(monto) || monto <= 0) {
          alert("Por favor ingresa un monto válido");
          return;
        }
        
        // Move to step 2
        document.getElementById('step1').style.display = 'none';
        document.getElementById('step2').style.display = 'block';
        document.getElementById('stepIndicator').innerText = '2';
        document.getElementById('step2Amount').innerText = monto.toFixed(2) + '€';
        currentStep = 2;
        
        // Load personas for selection
        loadPersonaSelector();
        if (tipo === 'Transferencia') {
          loadPersonaDestinoSelector();
        }
      } else if (currentStep === 2) {
        // Validate step 2
        var personaId = document.getElementById(field_persona).value;
        if (!personaId) {
          alert("Por favor selecciona un monedero");
          return;
        }
        
        var tipo = document.getElementById(field_tipo).value;
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
        
        // Move to step 3 - confirmation
        document.getElementById('step2').style.display = 'none';
        document.getElementById('step3').style.display = 'block';
        document.getElementById('stepIndicator').innerText = '3';
        
        var monto = parseFloat(document.getElementById(numpad_display).value);
        document.getElementById('confirmAmount').innerText = monto.toFixed(2) + '€';
        
        // Populate confirmation data
        var tipoText = document.getElementById(field_tipo).selectedOptions[0].text;
        var metodoText = document.getElementById(field_metodo).selectedOptions[0].text;
        var personaName = SC_Personas[personaId]?.Nombre || personaId;
        var notas = document.getElementById(field_notas).value || "(sin notas)";
        
        document.getElementById('confirmTipo').innerText = tipoText;
        document.getElementById('confirmMetodo').innerText = metodoText;
        document.getElementById('confirmPersona').innerText = personaName;
        document.getElementById('confirmNotas').innerText = notas;
        
        if (tipo === 'Transferencia') {
          var personaDestinoId = document.getElementById(field_persona_destino).value;
          var personaDestinoName = SC_Personas[personaDestinoId]?.Nombre || personaDestinoId;
          document.getElementById('confirmPersonaDestinoName').innerText = personaDestinoName;
          document.getElementById('confirmPersonaDestino').style.display = 'block';
        }
        
        // Switch to final button layout
        document.getElementById('buttonContainer').style.display = 'none';
        document.getElementById('buttonContainerFinal').style.display = 'grid';
        
        currentStep = 3;
      }
    };
    
    // Confirm final transaction button
    document.getElementById(btn_confirm + "2").onclick = () => {
      processTransaction();
    };
    
    // Back button
    document.getElementById(btn_back).onclick = () => {
      if (currentStep === 3) {
        // Go back to step 2
        document.getElementById('step3').style.display = 'none';
        document.getElementById('step2').style.display = 'block';
        document.getElementById('stepIndicator').innerText = '2';
        document.getElementById('buttonContainer').style.display = 'grid';
        document.getElementById('buttonContainerFinal').style.display = 'none';
        currentStep = 2;
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
      document.getElementById(field_persona).value = selectedPersona;
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
      document.getElementById(field_persona_destino).value = selectedPersonaDestino;
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
        if (metodo == "Tarjeta") {
          var persona = SC_Personas[personaId];
          var currentBalance = parseFloat(persona.Monedero_Balance || 0);
          if (currentBalance < monto) {
            if (!confirm(`Saldo insuficiente (${currentBalance.toFixed(2)}€). ¿Continuar de todos modos?`)) {
              return;
            }
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
      // Don't update balance for Efectivo Gastos (paying with cash)
      var shouldUpdateBalance = !(tipo === 'Gasto' && metodo === 'Efectivo');
      
      if (shouldUpdateBalance) {
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
      } else {
        // Skip balance update for Efectivo Gastos
        saveTransaction(ticketId, transactionData);
      }
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
        
        // Check for promotional bonus on Ingreso transactions (Efectivo only)
        if (data.Tipo === 'Ingreso' && data.Metodo === 'Efectivo') {
          var bonusAmount = calculatePromoBonus(data.Monto);
          if (bonusAmount > 0) {
            createPromoBonusTransaction(data.Persona, bonusAmount, data.Monto);
          }
        }
        
        toastr.success("¡Transacción completada!");
        setTimeout(() => {
          document.getElementById("actionStatus").style.display = "none";
          setUrlHash("pagos," + ticketId);
        }, 1500);
      });
    }
    
    function calculatePromoBonus(monto) {
      var amount = parseFloat(monto);
      
      if (amount >= 5) {
        return 0.20; // 20% bonus
      } else if (amount >= 4) {
        return 0.15; // 15% bonus
      } else if (amount >= 3) {
        return 0.10; // 10% bonus
      } else if (amount >= 2) {
        return 0.05; // 5% bonus
      }
      
      return 0; // No bonus for amounts under 2€
    }
    
    function createPromoBonusTransaction(personaId, bonusAmount, originalAmount) {
      return
      var bonusTicketId = safeuuid("");
      var bonusData = {
        Ticket: bonusTicketId,
        Fecha: CurrentISOTime(),
        Tipo: "Ingreso",
        Monto: bonusAmount,
        Persona: personaId,
        Metodo: "Efectivo",
        Notas: "Promo Bono - " + bonusAmount.toFixed(2) + "€ extra por recarga de " + originalAmount.toFixed(2) + "€",
        Estado: "Completado",
        Origen: "Promo Bono"
      };
      
      // Update wallet balance with bonus
      var persona = SC_Personas[personaId];
      if (persona) {
        var currentBalance = parseFloat(persona.Monedero_Balance || 0);
        var newBalance = currentBalance + bonusAmount;
        persona.Monedero_Balance = newBalance;
        
        TS_encrypt(persona, SECRET, (encrypted) => {
          betterGunPut(gun.get(TABLE).get("personas").get(personaId), encrypted);
        });
      }
      
      // Save bonus transaction
      TS_encrypt(bonusData, SECRET, (encrypted) => {
        betterGunPut(gun.get(TABLE).get("pagos").get(bonusTicketId), encrypted);
      });
      
      toastr.success("🎉 ¡Promo Bono aplicado! +" + bonusAmount.toFixed(2) + "€ extra");
    }
    
    function handleSuperCafePayment(transactionData) {
      // Mark the SuperCafé order as paid and delete it
      betterGunPut(gun.get(TABLE).get("supercafe").get(transactionData.OrigenID), null);
      
      // Update persona points
      var persona = SC_Personas[transactionData.Persona];
      if (!persona) return;
      
      // Check if paying with points or adding points
      if (false && persona.Puntos >= 10) {
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
      displayValue = prefilledData.monto;
      document.getElementById(numpad_display).value = displayValue;
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
    if (tid == "scan_qr") {
      PAGES.pagos.__scanQR()
      return
    }
    if (tid == "edit_transaction") {
      PAGES.pagos.__editTransaction(tid2[2])
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
    var btn_volver2 = safeuuid();
    var btn_edit = safeuuid();
    var btn_delete = safeuuid();
    var btn_revert = safeuuid();
    
    container.innerHTML = `
      <h1>Transacción <code id="${nameh1}"></code></h1>
      ${BuildQR("pagos," + tid, "Esta Transacción")}
      <button id="${btn_volver}">← Volver a Pagos</button>
      <button id="${btn_volver2}">← Volver a SuperCafé</button>
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
      
      <fieldset style="margin-top: 20px;">
        <legend>Acciones</legend>
        <button id="${btn_edit}" class="btn5" style="font-size: 16px; padding: 10px 20px; margin: 5px;">
          ✏️ Editar Transacción
        </button>
        <button id="${btn_revert}" class="btn6" style="font-size: 16px; padding: 10px 20px; margin: 5px;">
          ↩️ Revertir Transacción
        </button>
        <button id="${btn_delete}" class="rojo" style="font-size: 16px; padding: 10px 20px; margin: 5px;">
          🗑️ Eliminar Transacción
        </button>
      </fieldset>
    `;
    
    document.getElementById(btn_volver).onclick = () => {
      setUrlHash("pagos");
    };
    document.getElementById(btn_volver2).onclick = () => {
      setUrlHash("supercafe");
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
        
        // Edit button - navigate to edit mode
        document.getElementById(btn_edit).onclick = () => {
          setUrlHash("pagos,edit_transaction," + key);
        };
        
        // Delete button
        document.getElementById(btn_delete).onclick = () => {
          if (!checkRole("pagos:edit")) {
            alert("No tienes permisos para eliminar transacciones");
            return;
          }
          
          if (confirm("¿Estás seguro de que quieres ELIMINAR esta transacción?\n\nEsta acción NO se puede deshacer y los cambios en los monederos NO se revertirán automáticamente.\n\nPara revertir los cambios en los monederos, usa el botón 'Revertir Transacción' en su lugar.")) {
            betterGunPut(gun.get(TABLE).get("pagos").get(key), null);
            toastr.success("Transacción eliminada");
            setTimeout(() => {
              setUrlHash("pagos");
            }, 1000);
          }
        };
        
        // Revert button - reverses wallet balance changes and deletes transaction
        document.getElementById(btn_revert).onclick = () => {
          if (!checkRole("pagos:edit")) {
            alert("No tienes permisos para revertir transacciones");
            return;
          }
          
          if (confirm("¿Estás seguro de que quieres REVERTIR esta transacción?\n\nEsto revertirá los cambios en los monederos y eliminará la transacción.")) {
            // Reverse the wallet balance changes
            var tipo = data.Tipo;
            var monto = parseFloat(data.Monto || 0);
            var personaId = data.Persona;
            
            // For Ingreso, subtract from balance (reverse)
            // For Gasto, add to balance (reverse)
            // For Transferencia, reverse both sides
            
            if (tipo === "Ingreso") {
              revertWalletBalance(personaId, "Gasto", monto, () => {
                deleteTransaction(key);
              });
            } else if (tipo === "Gasto") {
              revertWalletBalance(personaId, "Ingreso", monto, () => {
                deleteTransaction(key);
              });
            } else if (tipo === "Transferencia") {
              var destinoId = data.PersonaDestino;
              revertWalletBalance(personaId, "Ingreso", monto, () => {
                revertWalletBalance(destinoId, "Gasto", monto, () => {
                  deleteTransaction(key);
                });
              });
            }
          }
        };
        
        function revertWalletBalance(personaId, tipo, monto, callback) {
          var persona = SC_Personas[personaId];
          if (!persona) {
            toastr.error("Error: Persona no encontrada");
            return;
          }
          
          var currentBalance = parseFloat(persona.Monedero_Balance || 0);
          var newBalance = currentBalance;
          
          if (tipo === "Ingreso") {
            newBalance = currentBalance + monto;
          } else if (tipo === "Gasto") {
            newBalance = currentBalance - monto;
          }
          
          persona.Monedero_Balance = newBalance;
          
          TS_encrypt(persona, SECRET, (encrypted) => {
            betterGunPut(gun.get(TABLE).get("personas").get(personaId), encrypted);
            if (callback) callback();
          });
        }
        
        function deleteTransaction(transactionKey) {
          betterGunPut(gun.get(TABLE).get("pagos").get(transactionKey), null);
          toastr.success("Transacción revertida y eliminada");
          setTimeout(() => {
            setUrlHash("pagos");
          }, 1000);
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
    
    // Persistent totals object by ID
    let totalData = {
      ingresos: {},  // { id: monto }
      gastos: {}     // { id: monto }
    };
    var balance_real = 0;
    setInterval(() => {
      balance_real = 0;
      Object.values(SC_Personas).forEach(persona => {
        balance_real += parseFloat(persona.Monedero_Balance || 0)
      });
      document.getElementById(balance_total).innerText = balance_real.toFixed(2) + "€";
      document.getElementById(balance_total).style.color = balance_real >= 0 ? "white" : "#ffcccc";
    }, 1000);
    TS_IndexElement(
      "pagos",
      config,
      gun.get(TABLE).get("pagos"),
      document.getElementById("tableContainer"),
      (data, new_tr) => {
        var id = data._key
    
        const monto = parseFloat(data.Monto || 0) || 0;
        const tipo = data.Tipo;
        const metodo = data.Metodo || "";
    
        // Count all Ingresos and Gastos in totals (excluding Transferencias)
        // Reset entries on every call for this ID
        if (tipo === "Ingreso") {
          if (data.Origen != "Promo Bono") {
            totalData.gastos[id] = 0;
            totalData.ingresos[id] = monto;
          }
        } else if (tipo === "Gasto") {
          if (metodo != "Tarjeta") {
            totalData.ingresos[id] = 0;
            totalData.gastos[id] = monto;
          }
        } else {
          // For Transferencias, don't count in totals
          totalData.ingresos[id] = 0;
          totalData.gastos[id] = 0;
        }
    
        // Compute totals by summing all objects
        const totalIngresos = Object.values(totalData.ingresos).reduce((a, b) => a + b, 0);
        const totalGastos = Object.values(totalData.gastos).reduce((a, b) => a + b, 0);
        const balance = totalIngresos - totalGastos;

        // Update UI
        document.getElementById(total_ingresos).innerText = totalIngresos.toFixed(2) + "€";
        document.getElementById(total_gastos).innerText = totalGastos.toFixed(2) + "€";
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
  },
  
  // QR Scanner for selecting wallet/persona
  __scanQR: function() {
    if (!checkRole("pagos:edit")) {
      setUrlHash("pagos");
      return;
    }
    
    var qrscan = safeuuid();
    var btn_cancel = safeuuid();
    
    container.innerHTML = `
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <h1 style="color: white; text-align: center; margin-bottom: 20px;">
          📷 Escanear QR de Monedero
        </h1>
        
        <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <p style="text-align: center; color: #333; margin-bottom: 15px;">
            Escanea el código QR del monedero de la persona para seleccionarlo automáticamente
          </p>
          <div style="max-width: 400px; margin: 0 auto;" id="${qrscan}"></div>
        </div>
        
        <button id="${btn_cancel}" style="width: 100%; padding: 20px; font-size: 18px; font-weight: bold; 
          background: #ff4757; color: white; border: none; border-radius: 8px; cursor: pointer;">
          ❌ Cancelar
        </button>
      </div>
    `;
    
    // Initialize QR scanner
    var html5QrcodeScanner = new Html5QrcodeScanner(
      qrscan, { fps: 10, qrbox: 250 }
    );
    
    function onScanSuccess(decodedText, decodedResult) {
      html5QrcodeScanner.clear();
      
      // Parse the QR code result
      // Expected format: "personas,{personaId}" or just "{personaId}"
      var personaId = decodedText;
      
      // If it's a full URL hash, extract the persona ID
      if (decodedText.includes("personas,")) {
        var parts = decodedText.split(",");
        if (parts.length > 1) {
          personaId = parts[1];
        }
      }
      
      // Verify the persona exists
      if (SC_Personas[personaId]) {
        toastr.success("✅ Monedero escaneado: " + SC_Personas[personaId].Nombre);
        
        // Store the selected persona in sessionStorage and return to datafono
        sessionStorage.setItem('pagos_scanned_persona', personaId);
        
        // Navigate back to datafono
        setUrlHash("pagos,datafono");
      } else {
        toastr.error("❌ Código QR no reconocido como un monedero válido");
        setTimeout(() => {
          setUrlHash("pagos,datafono");
        }, 2000);
      }
    }
    
    html5QrcodeScanner.render(onScanSuccess);
    EventListeners.QRScanner.push(html5QrcodeScanner);
    
    // Cancel button
    document.getElementById(btn_cancel).onclick = () => {
      html5QrcodeScanner.clear();
      setUrlHash("pagos,datafono");
    };
  },
  
  // Edit existing transaction
  __editTransaction: function(transactionId) {
    if (!checkRole("pagos:edit")) {
      setUrlHash("pagos");
      return;
    }
    
    var field_tipo = safeuuid();
    var field_monto = safeuuid();
    var field_persona = safeuuid();
    var field_persona_destino = safeuuid();
    var field_metodo = safeuuid();
    var field_notas = safeuuid();
    var field_estado = safeuuid();
    var div_persona_destino = safeuuid();
    var btn_save = safeuuid();
    var btn_cancel = safeuuid();
    
    var selectedPersona = "";
    var selectedPersonaDestino = "";
    var originalData = null;
    
    container.innerHTML = `
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <h1 style="color: white; text-align: center; margin-bottom: 20px;">
          ✏️ Editar Transacción
        </h1>
        
        <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <fieldset style="border: 2px solid #667eea; border-radius: 8px; padding: 15px;">
            <legend style="color: #667eea; font-weight: bold;">Información de Transacción</legend>
            
            <label style="display: block; margin-bottom: 15px;">
              <b>Tipo de Transacción:</b><br>
              <select id="${field_tipo}" style="width: 100%; padding: 10px; font-size: 16px; border: 2px solid #ddd; border-radius: 5px;">
                <option value="Ingreso">➕ Ingreso (Depósito)</option>
                <option value="Gasto">➖ Gasto (Retiro/Pago)</option>
                <option value="Transferencia">🔄 Transferencia</option>
              </select>
            </label>
            
            <label style="display: block; margin-bottom: 15px;">
              <b>Método de Pago:</b><br>
              <select id="${field_metodo}" style="width: 100%; padding: 10px; font-size: 16px; border: 2px solid #ddd; border-radius: 5px;">
                <option value="Efectivo">💵 Efectivo</option>
                <option value="Tarjeta">💳 Tarjeta Monedero</option>
                <option value="Otro">❓ Otro</option>
              </select>
            </label>
            
            <label style="display: block; margin-bottom: 15px;">
              <b>Monto (€):</b><br>
              <input type="number" id="${field_monto}" step="0.01" min="0"
                style="width: calc(100% - 24px); padding: 15px; font-size: 24px; text-align: right; 
                border: 3px solid #667eea; border-radius: 5px; font-weight: bold;">
            </label>
            
            <label style="display: block; margin-bottom: 15px;">
              <b>Estado:</b><br>
              <select id="${field_estado}" style="width: 100%; padding: 10px; font-size: 16px; border: 2px solid #ddd; border-radius: 5px;">
                <option value="Completado">✅ Completado</option>
                <option value="Pendiente">⏳ Pendiente</option>
                <option value="Cancelado">❌ Cancelado</option>
              </select>
            </label>
            
            <label style="display: block; margin-bottom: 15px;">
              <b>Monedero (Persona):</b>
              <input type="hidden" id="${field_persona}">
              <div id="personaSelector"></div>
            </label>
            
            <div id="${div_persona_destino}" style="display: none; margin-bottom: 15px;">
              <b>Monedero Destino:</b>
              <input type="hidden" id="${field_persona_destino}">
              <div id="personaDestinoSelector"></div>
            </div>
            
            <label style="display: block; margin-bottom: 15px;">
              <b>Notas:</b><br>
              <textarea id="${field_notas}" rows="3" 
                style="width: calc(100% - 24px); padding: 10px; font-size: 14px; border: 2px solid #ddd; border-radius: 5px;"
                placeholder="Notas adicionales..."></textarea>
            </label>
          </fieldset>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          <button id="${btn_cancel}" style="padding: 20px; font-size: 18px; font-weight: bold; 
            background: #ff4757; color: white; border: none; border-radius: 8px; cursor: pointer;">
            ❌ CANCELAR
          </button>
          <button id="${btn_save}" style="padding: 20px; font-size: 18px; font-weight: bold; 
            background: #2ed573; color: white; border: none; border-radius: 8px; cursor: pointer;">
            💾 GUARDAR
          </button>
        </div>
      </div>
    `;
    
    // Load transaction data
    gun.get(TABLE).get("pagos").get(transactionId).once((data, key) => {
      function loadTransactionData(data) {
        originalData = data;
        
        document.getElementById(field_tipo).value = data.Tipo || "Ingreso";
        document.getElementById(field_metodo).value = data.Metodo || "Efectivo";
        document.getElementById(field_monto).value = data.Monto || 0;
        document.getElementById(field_estado).value = data.Estado || "Completado";
        document.getElementById(field_notas).value = data.Notas || "";
        
        selectedPersona = data.Persona || "";
        selectedPersonaDestino = data.PersonaDestino || "";
        
        loadPersonaSelector();
        
        if (data.Tipo === "Transferencia") {
          document.getElementById(div_persona_destino).style.display = 'block';
          loadPersonaDestinoSelector();
        }
      }
      
      if (typeof data == "string") {
        TS_decrypt(data, SECRET, loadTransactionData);
      } else {
        loadTransactionData(data || {});
      }
    });
    
    // Tipo change handler
    document.getElementById(field_tipo).addEventListener('change', function() {
      var tipo = this.value;
      var divDestino = document.getElementById(div_persona_destino);
      if (tipo === 'Transferencia') {
        divDestino.style.display = 'block';
        loadPersonaDestinoSelector();
      } else {
        divDestino.style.display = 'none';
      }
    });
    
    function loadPersonaSelector() {
      var container = document.querySelector('#personaSelector');
      container.innerHTML = '';
      document.getElementById(field_persona).value = selectedPersona;
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
      document.getElementById(field_persona_destino).value = selectedPersonaDestino;
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
    
    // Save button
    document.getElementById(btn_save).onclick = () => {
      var tipo = document.getElementById(field_tipo).value;
      var monto = parseFloat(document.getElementById(field_monto).value);
      var personaId = document.getElementById(field_persona).value;
      var metodo = document.getElementById(field_metodo).value;
      var notas = document.getElementById(field_notas).value;
      var estado = document.getElementById(field_estado).value;
      
      if (!personaId) {
        alert("Por favor selecciona un monedero");
        return;
      }
      
      if (isNaN(monto) || monto < 0) {
        alert("Por favor ingresa un monto válido");
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
      
      if (!confirm("¿Estás seguro de que quieres guardar los cambios?\n\nNOTA: Los cambios en los monederos NO se ajustarán automáticamente. Si cambiaste el monto, tipo o persona, deberías revertir la transacción original y crear una nueva.")) {
        return;
      }
      
      // Update transaction data
      var updatedData = {
        ...originalData,
        Tipo: tipo,
        Monto: monto,
        Persona: personaId,
        Metodo: metodo,
        Notas: notas,
        Estado: estado
      };
      
      if (tipo === 'Transferencia') {
        updatedData.PersonaDestino = document.getElementById(field_persona_destino).value;
      } else {
        delete updatedData.PersonaDestino;
      }
      
      TS_encrypt(updatedData, SECRET, (encrypted) => {
        document.getElementById("actionStatus").style.display = "block";
        betterGunPut(gun.get(TABLE).get("pagos").get(transactionId), encrypted);
        toastr.success("¡Transacción actualizada!");
        setTimeout(() => {
          document.getElementById("actionStatus").style.display = "none";
          setUrlHash("pagos," + transactionId);
        }, 1500);
      });
    };
    
    // Cancel button
    document.getElementById(btn_cancel).onclick = () => {
      if (confirm("¿Seguro que quieres cancelar? Los cambios no se guardarán.")) {
        setUrlHash("pagos," + transactionId);
      }
    };
  }
};
