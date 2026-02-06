PERMS['cajas'] = 'Cajas';
PERMS['cajas:edit'] = '&gt; Editar';
PAGES.cajas = {
  navcss: 'btn8',
  icon: 'static/appico/credit_cards.png',
  AccessControl: true,
  Title: 'Cajas',

  // View/edit a specific transaction (movimiento)
  movimiento: function (cajaId, movimientoId) {
    if (!checkRole('cajas')) {
      setUrlHash('cajas');
      return;
    }

    var field_fecha = safeuuid();
    var field_tipo = safeuuid();
    var field_monto = safeuuid();
    var field_persona = safeuuid();
    var field_notas = safeuuid();
    var field_foto = safeuuid();
    var render_foto = safeuuid();
    var btn_volver = safeuuid();
    var btn_borrar = safeuuid();
    var btn_editar = safeuuid();
    var btn_guardar = safeuuid();
    var btn_cancelar = safeuuid();
    var div_buttons = safeuuid();
    var isEditMode = false;

    container.innerHTML = html`
      <h1>Movimiento de Caja</h1>
      <fieldset>
        <label>
          Fecha<br>
          <input type="datetime-local" id="${field_fecha}" disabled><br><br>
        </label>
        <label>
          Tipo<br>
          <input type="text" id="${field_tipo}" disabled><br><br>
        </label>
        <label>
          Monto<br>
          <input type="number" step="0.01" id="${field_monto}" disabled><br><br>
        </label>
        <label>
          Persona<br>
          <input type="text" id="${field_persona}" disabled><br><br>
        </label>
        <label>
          Foto del Ticket<br>
          <img id="${render_foto}" height="200px" style="border: 3px solid #ddd; display: none; margin: 10px 0; cursor: pointer;">
          <input type="file" accept="image/*" id="${field_foto}" style="display: none;">
        </label>
        <label>
          Notas<br>
          <textarea id="${field_notas}" disabled rows="4"></textarea><br><br>
        </label>
        <hr>
        <div id="${div_buttons}">
          <button class="btn5" id="${btn_volver}">Volver a Caja</button>
          <button class="btn5" id="${btn_editar}" style="display: none;">Editar</button>
          <button class="btn5" id="${btn_guardar}" style="display: none;">Guardar</button>
          <button class="rojo" id="${btn_cancelar}" style="display: none;">Cancelar</button>
          <button class="rojo" id="${btn_borrar}" style="display: none;">Borrar</button>
        </div>
      </fieldset>
    `;

    // Load transaction data
    var movimientoData = null;
    var resized = '';

    DB.get('cajas_movimientos', movimientoId).then((data) => {
      function load_data(data) {
        if (!data) return;
        
        movimientoData = data;
        
        // Format datetime for datetime-local input
        var fechaValue = data['Fecha'] || '';
        if (fechaValue) {
          // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
          fechaValue = fechaValue.substring(0, 16);
        }
        
        document.getElementById(field_fecha).value = fechaValue;
        document.getElementById(field_tipo).value = data['Tipo'] || '';
        document.getElementById(field_monto).value = data['Monto'] || 0;
        
        // Get persona name
        var personaId = data['Persona'] || '';
        var personaName = personaId;
        if (SC_Personas[personaId]) {
          personaName = SC_Personas[personaId].Nombre || personaId;
        }
        document.getElementById(field_persona).value = personaName;
        document.getElementById(field_notas).value = data['Notas'] || '';

        // Load photo attachment if present
        if (DB.getAttachment) {
          DB.getAttachment('cajas_movimientos', movimientoId, 'foto')
            .then((durl) => {
              try {
                if (durl) {
                  var fotoElement = document.getElementById(render_foto);
                  if (fotoElement) {
                    fotoElement.src = durl;
                    fotoElement.style.display = 'block';
                  }
                }
              } catch (e) {
                console.warn('Error setting foto:', e);
              }
            })
            .catch((e) => {
              console.warn('Error loading foto:', e);
            });
        }
      }

      if (typeof data === 'string') {
        TS_decrypt(
          data,
          SECRET,
          (data, wasEncrypted) => {
            load_data(data);
          },
          'cajas_movimientos',
          movimientoId
        );
      } else {
        load_data(data || {});
      }
    });

    // Enable edit mode
    function enableEditMode() {
      isEditMode = true;
      document.getElementById(field_fecha).disabled = false;
      document.getElementById(field_tipo).disabled = false;
      document.getElementById(field_monto).disabled = false;
      document.getElementById(field_persona).disabled = false;
      document.getElementById(field_notas).disabled = false;
      document.getElementById(render_foto).style.cursor = 'pointer';
      
      document.getElementById(btn_editar).style.display = 'none';
      document.getElementById(btn_volver).style.display = 'none';
      document.getElementById(btn_guardar).style.display = 'inline-block';
      document.getElementById(btn_cancelar).style.display = 'inline-block';
      document.getElementById(btn_borrar).style.display = 'none';
    }

    // Disable edit mode
    function disableEditMode() {
      isEditMode = false;
      document.getElementById(field_fecha).disabled = true;
      document.getElementById(field_tipo).disabled = true;
      document.getElementById(field_monto).disabled = true;
      document.getElementById(field_persona).disabled = true;
      document.getElementById(field_notas).disabled = true;
      document.getElementById(render_foto).style.cursor = 'default';
      
      document.getElementById(btn_editar).style.display = checkRole('cajas:edit') ? 'inline-block' : 'none';
      document.getElementById(btn_volver).style.display = 'inline-block';
      document.getElementById(btn_guardar).style.display = 'none';
      document.getElementById(btn_cancelar).style.display = 'none';
      document.getElementById(btn_borrar).style.display = checkRole('cajas:edit') ? 'inline-block' : 'none';
    }

    // Button handlers
    document.getElementById(btn_volver).onclick = () => {
      setUrlHash('cajas,' + cajaId);
    };

    document.getElementById(btn_editar).onclick = () => {
      enableEditMode();
    };

    document.getElementById(btn_cancelar).onclick = () => {
      disableEditMode();
      // Reload data to discard changes
      DB.get('cajas_movimientos', movimientoId).then((data) => {
        if (typeof data === 'string') {
          TS_decrypt(data, SECRET, (d) => { load_data(d); }, 'cajas_movimientos', movimientoId);
        } else {
          load_data(data || {});
        }
      });
    };

    // Photo click handler
    document.getElementById(render_foto).onclick = () => {
      if (isEditMode) {
        // In edit mode: upload new photo
        document.getElementById(field_foto).click();
      } else {
        // In read mode: open photo in new tab
        var fotoElement = document.getElementById(render_foto);
        if (fotoElement && fotoElement.src) {
          window.open(fotoElement.src, '_blank');
        }
      }
    };

    document.getElementById(field_foto).addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (ev) {
        const url = ev.target.result;
        document.getElementById(render_foto).src = url;
        resized = url;
      };
      reader.readAsDataURL(file);
    });

    // Save handler
    document.getElementById(btn_guardar).onclick = () => {
      var guardarBtn = document.getElementById(btn_guardar);
      if (guardarBtn.disabled) return;

      var tipo = document.getElementById(field_tipo).value;
      var monto = parseFloat(document.getElementById(field_monto).value);
      var fecha = document.getElementById(field_fecha).value;
      var notas = document.getElementById(field_notas).value;

      // Validation
      if (!tipo) {
        alert('Por favor selecciona el tipo de movimiento');
        return;
      }
      if (!monto || monto <= 0) {
        alert('Por favor ingresa un monto válido');
        return;
      }
      if (!fecha) {
        alert('Por favor selecciona una fecha');
        return;
      }

      guardarBtn.disabled = true;
      guardarBtn.style.opacity = '0.5';

      var fechaISO = new Date(fecha).toISOString();

      var data = {
        Caja: movimientoData.Caja,
        Fecha: fechaISO,
        Tipo: tipo,
        Monto: monto,
        Persona: movimientoData.Persona,
        Notas: notas,
      };

      // Preserve transfer destination if applicable
      if (movimientoData.CajaDestino) {
        data.CajaDestino = movimientoData.CajaDestino;
      }

      document.getElementById('actionStatus').style.display = 'block';
      DB.put('cajas_movimientos', movimientoId, data)
        .then(() => {
          // Save photo attachment if a new one was provided
          var attachPromise = Promise.resolve(true);
          if (resized && resized.indexOf('data:') === 0) {
            attachPromise = DB.putAttachment(
              'cajas_movimientos',
              movimientoId,
              'foto',
              resized,
              'image/png'
            );
          }

          attachPromise
            .then(() => {
              toastr.success('Movimiento actualizado!');
              disableEditMode();
              document.getElementById('actionStatus').style.display = 'none';
              // Reload to show updates
              setTimeout(() => {
                PAGES.cajas.movimiento(cajaId, movimientoId);
              }, SAVE_WAIT);
            })
            .catch((e) => {
              console.warn('Error saving:', e);
              document.getElementById('actionStatus').style.display = 'none';
              guardarBtn.disabled = false;
              guardarBtn.style.opacity = '1';
              toastr.error('Error al guardar el movimiento');
            });
        })
        .catch((e) => {
          console.warn('DB.put error', e);
          document.getElementById('actionStatus').style.display = 'none';
          guardarBtn.disabled = false;
          guardarBtn.style.opacity = '1';
          toastr.error('Error al guardar el movimiento');
        });
    };

    // Show/hide edit button based on permissions
    if (checkRole('cajas:edit')) {
      document.getElementById(btn_editar).style.display = 'inline-block';
      document.getElementById(btn_borrar).style.display = 'inline-block';
    }

    // Delete handler
    document.getElementById(btn_borrar).onclick = () => {
      if (confirm('¿Quieres borrar este movimiento?')) {
        DB.del('cajas_movimientos', movimientoId).then(() => {
          toastr.success('Movimiento borrado!');
          setTimeout(() => {
            setUrlHash('cajas,' + cajaId);
          }, SAVE_WAIT);
        });
      }
    };
  },

  // Create new transaction (movimiento)
  nuevo_movimiento: function (cajaId) {
    if (!checkRole('cajas:edit')) {
      setUrlHash('cajas,' + cajaId);
      return;
    }

    var field_fecha = safeuuid();
    var field_tipo = safeuuid();
    var field_monto = safeuuid();
    var field_persona = safeuuid();
    var field_notas = safeuuid();
    var field_foto = safeuuid();
    var render_foto = safeuuid();
    var field_caja_destino = safeuuid();
    var div_caja_destino = safeuuid();
    var btn_guardar = safeuuid();
    var btn_cancelar = safeuuid();

    var resized = '';

    container.innerHTML = html`
      <h1>Nuevo Movimiento</h1>
      <fieldset>
        <label>
          Fecha y Hora<br>
          <input type="datetime-local" id="${field_fecha}"><br><br>
        </label>
        <label>
          Tipo de Movimiento<br>
          <select id="${field_tipo}">
            <option value="">-- Seleccionar --</option>
            <option value="Ingreso">+ Ingreso</option>
            <option value="Gasto">- Gasto</option>
            <option value="Transferencia">> Transferencia</option>
          </select><br><br>
        </label>
        <label>
          Monto (€)<br>
          <input type="number" step="0.01" min="0" id="${field_monto}" placeholder="0.00"><br><br>
        </label>
        <label>
          Persona<br>
          <input type="hidden" id="${field_persona}">
          <div id="personaSelector"></div>
        </label>
        <div id="${div_caja_destino}" style="display: none;">
          <label>
            Caja Destino (para transferencias)<br>
            <select id="${field_caja_destino}">
              <option value="">-- Seleccionar Caja Destino --</option>
            </select><br><br>
          </label>
        </div>
        <label>
          Foto del Ticket<br>
          <small>Obligatorio para gastos</small><br>
          <img id="${render_foto}" height="150px" style="border: 3px dashed #ccc; min-width: 100px; cursor: pointer; display: block; margin: 10px 0; background: #f5f5f5;" title="Haz clic para subir foto">
          <input type="file" accept="image/*" id="${field_foto}" style="display: none;"><br>
        </label>
        <label>
          Notas<br>
          <textarea id="${field_notas}" rows="4" placeholder="Descripción del movimiento..."></textarea><br><br>
        </label>
        <hr>
        <button class="btn5" id="${btn_guardar}">Guardar Movimiento</button>
        <button class="rojo" id="${btn_cancelar}">Cancelar</button>
      </fieldset>
    `;

    // Set current datetime
    var now = new Date();
    var tzOffset = now.getTimezoneOffset() * 60000;
    var localISOTime = new Date(now - tzOffset).toISOString().slice(0, 16);
    document.getElementById(field_fecha).value = localISOTime;

    // Load personas for selection
    var selectedPersona = '';
    var container_personas = document.querySelector('#personaSelector');
    addCategory_Personas(
      container_personas,
      SC_Personas,
      selectedPersona,
      (personaId) => {
        document.getElementById(field_persona).value = personaId;
        selectedPersona = personaId;
      },
      'Persona',
      false,
      '- No hay personas registradas -'
    );

    // Load cajas for destination selection
    DB.map('cajas', (data, key) => {
      function addCajaOption(cajaData, cajaKey) {
        if (cajaKey === cajaId) return; // Don't show current caja
        var select = document.getElementById(field_caja_destino);
        if (!select) return;
        var option = document.createElement('option');
        option.value = cajaKey;
        option.textContent = cajaData.Nombre || cajaKey;
        select.appendChild(option);
      }

      if (typeof data === 'string') {
        TS_decrypt(
          data,
          SECRET,
          (cajaData, wasEncrypted) => {
            addCajaOption(cajaData, key);
          },
          'cajas',
          key
        );
      } else {
        addCajaOption(data, key);
      }
    });

    // Show/hide destination caja based on transaction type
    document.getElementById(field_tipo).addEventListener('change', function () {
      var tipo = this.value;
      var divDestino = document.getElementById(div_caja_destino);
      if (tipo === 'Transferencia') {
        divDestino.style.display = 'block';
      } else {
        divDestino.style.display = 'none';
      }
    });

    // Photo upload handler (click image to upload)
    document.getElementById(render_foto).onclick = () => {
      document.getElementById(field_foto).click();
    };

    document.getElementById(field_foto).addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (ev) {
        const url = ev.target.result;
        document.getElementById(render_foto).src = url;
        resized = url;
      };
      reader.readAsDataURL(file);
    });

    document.getElementById(btn_guardar).onclick = () => {
      var guardarBtn = document.getElementById(btn_guardar);
      if (guardarBtn.disabled) return;

      var tipo = document.getElementById(field_tipo).value;
      var monto = parseFloat(document.getElementById(field_monto).value);
      var personaId = document.getElementById(field_persona).value;
      var fecha = document.getElementById(field_fecha).value;
      var notas = document.getElementById(field_notas).value;
      var cajaDestinoId = document.getElementById(field_caja_destino).value;

      // Validation
      if (!tipo) {
        alert('Por favor selecciona el tipo de movimiento');
        return;
      }
      if (!monto || monto <= 0) {
        alert('Por favor ingresa un monto válido');
        return;
      }
      if (!personaId) {
        alert('Por favor selecciona una persona');
        return;
      }
      if (!fecha) {
        alert('Por favor selecciona una fecha');
        return;
      }

      // Validate destination caja for transfers
      if (tipo === 'Transferencia') {
        if (!cajaDestinoId) {
          alert('Por favor selecciona la caja destino para la transferencia');
          return;
        }
        if (cajaDestinoId === cajaId) {
          alert('No puedes transferir a la misma caja');
          return;
        }
      }

      // Validate photo for expenses
      if (tipo === 'Gasto' && !resized) {
        alert('La foto del ticket es obligatoria para gastos');
        return;
      }

      guardarBtn.disabled = true;
      guardarBtn.style.opacity = '0.5';

      var movimientoId = safeuuid('');
      var fechaISO = new Date(fecha).toISOString();

      var data = {
        Caja: cajaId,
        Fecha: fechaISO,
        Tipo: tipo,
        Monto: monto,
        Persona: personaId,
        Notas: notas,
      };

      // Add destination caja for transfers
      if (tipo === 'Transferencia') {
        data.CajaDestino = cajaDestinoId;
      }

      document.getElementById('actionStatus').style.display = 'block';
      DB.put('cajas_movimientos', movimientoId, data)
        .then(() => {
          // Save photo attachment if present
          var attachPromise = Promise.resolve(true);
          if (resized && resized.indexOf('data:') === 0) {
            attachPromise = DB.putAttachment(
              'cajas_movimientos',
              movimientoId,
              'foto',
              resized,
              'image/png'
            );
          }

          attachPromise
            .then(() => {
              // Update source caja balance
              return updateCajaBalance(cajaId, tipo, monto);
            })
            .then(() => {
              // If transfer, update destination caja balance
              if (tipo === 'Transferencia' && cajaDestinoId) {
                return updateCajaBalance(cajaDestinoId, 'Ingreso', monto);
              }
              return Promise.resolve();
            })
            .then(() => {
              toastr.success('Movimiento guardado!');
              setTimeout(() => {
                document.getElementById('actionStatus').style.display = 'none';
                setUrlHash('cajas,' + cajaId);
              }, SAVE_WAIT);
            })
            .catch((e) => {
              console.warn('Error saving:', e);
              document.getElementById('actionStatus').style.display = 'none';
              guardarBtn.disabled = false;
              guardarBtn.style.opacity = '1';
              toastr.error('Error al guardar el movimiento');
            });
        })
        .catch((e) => {
          console.warn('DB.put error', e);
          document.getElementById('actionStatus').style.display = 'none';
          guardarBtn.disabled = false;
          guardarBtn.style.opacity = '1';
          toastr.error('Error al guardar el movimiento');
        });
    };

    document.getElementById(btn_cancelar).onclick = () => {
      setUrlHash('cajas,' + cajaId);
    };

    function updateCajaBalance(cajaId, tipo, monto) {
      return DB.get('cajas', cajaId).then((caja) => {
        function updateBalance(cajaData) {
          var currentBalance = parseFloat(cajaData.Balance || 0);
          var newBalance = currentBalance;

          if (tipo === 'Ingreso') {
            newBalance = currentBalance + monto;
          } else if (tipo === 'Gasto' || tipo === 'Transferencia') {
            // For transfers, this updates the source caja (deduct amount)
            newBalance = currentBalance - monto;
          }

          cajaData.Balance = fixfloat(newBalance);
          return DB.put('cajas', cajaId, cajaData);
        }

        if (typeof caja === 'string') {
          return new Promise((resolve, reject) => {
            TS_decrypt(
              caja,
              SECRET,
              (cajaData, wasEncrypted) => {
                updateBalance(cajaData).then(resolve).catch(reject);
              },
              'cajas',
              cajaId
            );
          });
        } else {
          return updateBalance(caja || {});
        }
      });
    }
  },

  // View/edit a cash register (caja)
  edit: function (mid) {
    if (!checkRole('cajas')) {
      setUrlHash('cajas');
      return;
    }

    // Check for special routes
    var parts = location.hash.split(',');
    if (parts[2] === 'movimientos' && parts[3] === '_nuevo') {
      PAGES.cajas.nuevo_movimiento(parts[1]);
      return;
    }
    if (parts[2] === 'movimiento' && parts[3]) {
      PAGES.cajas.movimiento(parts[1], parts[3]);
      return;
    }

    var nameh1 = safeuuid();
    var field_nombre = safeuuid();
    var field_balance = safeuuid();
    var field_notas = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    var btn_nuevo_movimiento = safeuuid();
    var movimientos_container = safeuuid();

    var isMonederos = mid === 'monederos';

    container.innerHTML = html`
      <h1>${isMonederos ? 'Monederos' : 'Caja'} <code id="${nameh1}"></code></h1>
      ${isMonederos ? '' : BuildQR('cajas,' + mid, 'Esta Caja')}
      <fieldset>
        <label>
          Nombre de la Caja<br>
          <input type="text" id="${field_nombre}" ${isMonederos ? 'disabled' : ''}><br><br>
        </label>
        <label>
          Balance Actual (€)<br>
          <input type="number" step="0.01" id="${field_balance}" disabled 
            style="font-size: 28px; font-weight: bold; color: #1976d2;"><br>
          <small>Se actualiza automáticamente con los movimientos</small><br><br>
        </label>
        <label>
          Notas<br>
          <textarea id="${field_notas}" ${isMonederos ? 'disabled' : ''} rows="3"></textarea><br><br>
        </label>
        <hr>
        ${
          isMonederos
            ? ''
            : html`
                <button class="btn5" id="${btn_guardar}">Guardar</button>
                <button class="rojo" id="${btn_borrar}">Borrar Caja</button>
              `
        }
      </fieldset>

      <h2>Movimientos de ${isMonederos ? 'Monederos' : 'esta Caja'}</h2>
      ${
        isMonederos
          ? html`<p><small>Aquí se muestran todas las transacciones de los monederos (módulo Pagos)</small></p>`
          : html`<button class="btn5" id="${btn_nuevo_movimiento}">+ Nuevo Movimiento</button>`
      }
      <div id="${movimientos_container}"></div>
    `;

    // Load caja data
    if (!isMonederos) {
      DB.get('cajas', mid).then((data) => {
        function load_data(data) {
          document.getElementById(nameh1).innerText = mid;
          document.getElementById(field_nombre).value = data['Nombre'] || '';
          document.getElementById(field_balance).value = data['Balance'] || 0;
          document.getElementById(field_notas).value = data['Notas'] || '';
        }

        if (typeof data === 'string') {
          TS_decrypt(
            data,
            SECRET,
            (data, wasEncrypted) => {
              load_data(data);
            },
            'cajas',
            mid
          );
        } else {
          load_data(data || {});
        }
      });

      document.getElementById(btn_guardar).onclick = () => {
        var guardarBtn = document.getElementById(btn_guardar);
        if (guardarBtn.disabled) return;

        guardarBtn.disabled = true;
        guardarBtn.style.opacity = '0.5';

        var data = {
          Nombre: document.getElementById(field_nombre).value,
          Balance: parseFloat(document.getElementById(field_balance).value) || 0,
          Notas: document.getElementById(field_notas).value,
        };

        document.getElementById('actionStatus').style.display = 'block';
        DB.put('cajas', mid, data)
          .then(() => {
            toastr.success('Guardado!');
            setTimeout(() => {
              document.getElementById('actionStatus').style.display = 'none';
              setUrlHash('cajas');
            }, SAVE_WAIT);
          })
          .catch((e) => {
            console.warn('DB.put error', e);
            guardarBtn.disabled = false;
            guardarBtn.style.opacity = '1';
            document.getElementById('actionStatus').style.display = 'none';
            toastr.error('Error al guardar la caja');
          });
      };

      document.getElementById(btn_borrar).onclick = () => {
        if (confirm('¿Quieres borrar esta caja? Los movimientos no se borrarán.')) {
          DB.del('cajas', mid).then(() => {
            toastr.error('Caja borrada!');
            setTimeout(() => {
              setUrlHash('cajas');
            }, SAVE_WAIT);
          });
        }
      };

      document.getElementById(btn_nuevo_movimiento).onclick = () => {
        setUrlHash('cajas,' + mid + ',_nuevo');
      };
    } else {
      // Monederos - show aggregated wallet data
      document.getElementById(nameh1).innerText = 'Monederos';
      document.getElementById(field_nombre).value = 'Monederos (Tarjetas)';
      
      // Calculate total balance from all personas
      var totalBalance = 0;
      Object.values(SC_Personas).forEach((persona) => {
        totalBalance += parseFloat(persona.Monedero_Balance || 0);
      });
      document.getElementById(field_balance).value = fixfloat(totalBalance);
      document.getElementById(field_notas).value = 'Movimientos de todos los monederos del sistema';
    }

    // Load movements for this caja (or all pagos for monederos)
    if (isMonederos) {
      // Show pagos transactions
      const config = [
        {
          key: 'Fecha',
          label: 'Fecha',
          type: 'template',
          template: (data, element) => {
            var fecha = data.Fecha || '';
            if (fecha) {
              var d = new Date(fecha);
              element.innerText = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
            }
          },
          default: '',
        },
        { key: 'Tipo', label: 'Tipo', type: 'text', default: '' },
        {
          key: 'Monto',
          label: 'Monto',
          type: 'template',
          template: (data, element) => {
            var tipo = data.Tipo || '';
            var monto = parseFloat(data.Monto || 0);
            var sign = tipo === 'Ingreso' ? '+' : '-';
            var color = tipo === 'Ingreso' ? 'green' : 'red';
            element.innerHTML = html`<span style="color: ${color}; font-weight: bold;">${sign}${monto.toFixed(2)}€</span>`;
          },
          default: '0.00€',
        },
        {
          key: 'Persona',
          label: 'Monedero',
          type: 'persona-nombre',
          default: '',
        },
        { key: 'Metodo', label: 'Método', type: 'text', default: '' },
        { key: 'Notas', label: 'Notas', type: 'text', default: '' },
      ];

      TS_IndexElement(
        'pagos',
        config,
        'pagos',
        document.getElementById(movimientos_container),
        function (data, new_tr) {
          new_tr.onclick = () => {
            setUrlHash('pagos,' + data._key);
          };
        },
        undefined,
        true
      );
    } else {
      // Show cajas_movimientos for this specific caja
      const config = [
        {
          key: 'Fecha',
          label: 'Fecha',
          type: 'template',
          template: (data, element) => {
            var fecha = data.Fecha || '';
            if (fecha) {
              var d = new Date(fecha);
              element.innerText = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
            }
          },
          default: '',
        },
        { key: 'Tipo', label: 'Tipo', type: 'text', default: '' },
        {
          key: 'Monto',
          label: 'Monto',
          type: 'template',
          template: (data, element) => {
            var tipo = data.Tipo || '';
            var monto = parseFloat(data.Monto || 0);
            var sign = tipo === 'Ingreso' ? '+' : tipo === 'Gasto' ? '-' : '<->';
            var color = tipo === 'Ingreso' ? 'green' : tipo === 'Gasto' ? 'red' : 'blue';
            element.innerHTML = html`<span style="color: ${color}; font-weight: bold;">${sign}${monto.toFixed(2)}€</span>`;
          },
          default: '0.00€',
        },
        {
          key: 'Persona',
          label: 'Persona',
          type: 'persona-nombre',
          default: '',
        },
        { key: 'Notas', label: 'Notas', type: 'text', default: '' },
      ];

      TS_IndexElement(
        'cajas,' + mid + ',movimiento',
        config,
        'cajas_movimientos',
        document.getElementById(movimientos_container),
        function (data, new_tr) {
          new_tr.onclick = () => {
            setUrlHash('cajas,' + mid + ',movimiento,' + data._key);
          };
        },
        function (data) {
          // Filter: only show movements for this caja (return true to HIDE the row)
          return data.Caja !== mid;
        },
        true
      );
    }
  },

  // List all cash registers
  index: function () {
    if (!checkRole('cajas')) {
      setUrlHash('index');
      return;
    }

    var btn_new = safeuuid();
    var btn_monederos = safeuuid();
    var tableContainer = safeuuid();

    container.innerHTML = html`
      <h1>Cajas</h1>
      <button class="btn5" id="${btn_monederos}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; margin-bottom: 10px;">
        Ver Monederos
      </button>
      <button id="${btn_new}">Nueva Caja</button>
      <div id="${tableContainer}"></div>
    `;

    const config = [
      { key: 'Nombre', label: 'Nombre', type: 'text', default: '' },
      {
        key: 'Balance',
        label: 'Balance',
        type: 'template',
        template: (data, element) => {
          var balance = parseFloat(data.Balance || 0);
          var color = balance >= 0 ? 'green' : 'red';
          element.innerHTML = html`<span style="color: ${color}; font-weight: bold; font-size: 18px;">${balance.toFixed(2)}€</span>`;
        },
        default: '0.00€',
      },
      { key: 'Notas', label: 'Notas', type: 'text', default: '' },
    ];

    TS_IndexElement(
      'cajas',
      config,
      'cajas',
      document.getElementById(tableContainer),
      undefined,
      undefined,
      true
    );

    document.getElementById(btn_monederos).onclick = () => {
      setUrlHash('cajas,monederos');
    };

    if (!checkRole('cajas:edit')) {
      document.getElementById(btn_new).style.display = 'none';
    } else {
      document.getElementById(btn_new).onclick = () => {
        setUrlHash('cajas,' + safeuuid(''));
      };
    }
  },
};
