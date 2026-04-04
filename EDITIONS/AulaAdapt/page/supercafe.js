PERMS['supercafe'] = 'Cafetería';
PERMS['supercafe:edit'] = '&gt; Editar';
PAGES.supercafe = {
  navcss: 'btn4',
  icon: 'static/appico/cup.png',
  faicon: 'fas fa-coffee',
  AccessControl: true,
  Title: 'Cafetería',
  navItems: [
    { label: 'Ver pedidos', hash: 'supercafe', icon: 'fas fa-coffee' },
    { label: 'Nuevo pedido', hash: 'supercafe,$nuevo$', icon: 'fas fa-plus-circle' },
  ],
  edit: function (mid) {
    if (!checkRole('supercafe:edit')) {
      setUrlHash('supercafe');
      return;
    }
    if (mid === '$nuevo$') {
      mid = safeuuid(''); // UID without html-safe prefix
    }
    var nameh1 = safeuuid();
    var field_fecha = safeuuid();
    var field_persona = safeuuid();
    var field_comanda = safeuuid();
    var field_notas = safeuuid();
    var field_estado = safeuuid();
    var div_actions = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    container.innerHTML = html`
      <h1>Comanda <code id="${nameh1}"></code></h1>
      <button onclick="setUrlHash('supercafe');">Salir</button>
      <fieldset style="text-align: center;">
        <legend>Rellenar comanda</legend>
        <label style="display: none;">
          Fecha<br />
          <input readonly disabled type="text" id="${field_fecha}" value="" /><br /><br />
        </label>
        <label style="display: none;">
          Persona<br />
          <input type="hidden" id="${field_persona}" />
          <br /><br />
        </label>
        <label style="display: none;">
          Comanda (utiliza el panel de relleno)<br />
          <textarea readonly disabled id="${field_comanda}"></textarea><br /><br />
        </label>
        <div id="${div_actions}" open>
          <!--<summary>Mostrar botones de relleno</summary>-->
        </div>
        <label>
          Notas<br />
          <textarea id="${field_notas}"></textarea><br /><br />
        </label>
        <label style="display: none;">
          Estado<br />
          <input readonly disabled type="text" id="${field_estado}" value="%%" />
          <br />Modificar en el listado de comandas<br />
        </label>
        <div>
          <button id=${btn_guardar} class="btn5">Guardar</button>
          <button id=${btn_borrar} class="rojo">Borrar</button>
        </div>
      </fieldset>
    `;
    var currentData = {};
    var currentPersonaID = '';
    var divact = document.getElementById(div_actions);

    function loadActions() {
      divact.innerHTML = '';
      addCategory_Personas(divact, SC_Personas, currentPersonaID, (value) => {
        document.getElementById(field_persona).value = value;

        // Check for outstanding debts when person is selected
        DB.list('supercafe')
          .then((rows) => {
            var deudasCount = 0;
            var processed = 0;
            var total = rows.length;

            if (total === 0) return;

            // Count debts for this person
            rows.forEach((row) => {
              TS_decrypt(
                row.data,
                SECRET,
                (data) => {
                  if (data.Persona == value && data.Estado == 'Deuda') {
                    deudasCount++;
                  }
                  processed++;

                  // When all rows are processed, show warning if needed
                  if (processed === total && deudasCount >= 3) {
                    var tts_msg = `Atención: Esta persona tiene ${deudasCount} comandas en deuda. No se podrá guardar el pedido.`;
                    TS_SayTTS(tts_msg);
                    toastr.warning(
                      `Esta persona tiene ${deudasCount} comandas en deuda. No se podrá guardar el pedido.`,
                      '',
                      {
                        timeOut: 5000,
                      }
                    );
                  }
                },
                'supercafe',
                row.id
              );
            });
          })
          .catch((e) => {
            console.warn('Error checking debts', e);
          });
      });
      Object.entries(SC_actions).forEach((category) => {
        addCategory(
          divact,
          category[0],
          SC_actions_icons[category[0]],
          category[1],
          currentData,
          (values) => {
            document.getElementById(field_comanda).value = SC_parse(values);
          }
        );
      });
    }
    loadActions();
    DB.get('supercafe', mid).then((data) => {
      function load_data(data, ENC = '') {
        document.getElementById(nameh1).innerText = mid;
        document.getElementById(field_fecha).value = data['Fecha'] || CurrentISODate();
        document.getElementById(field_persona).value = data['Persona'] || '';
        currentPersonaID = data['Persona'] || '';
        document.getElementById(field_comanda).value =
          SC_parse(JSON.parse(data['Comanda'] || '{}')) || '';
        document.getElementById(field_notas).value = data['Notas'] || '';
        document.getElementById(field_estado).value = data['Estado'] || '%%';
        currentData = JSON.parse(data['Comanda'] || '{}');

        loadActions();
      }
      if (typeof data == 'string') {
        TS_decrypt(
          data,
          SECRET,
          (data, wasEncrypted) => {
            load_data(data, '%E');
          },
          'supercafe',
          mid
        );
      } else {
        load_data(data || {});
      }
    });
    document.getElementById(btn_guardar).onclick = () => {
      // Check if button is already disabled to prevent double-clicking
      var guardarBtn = document.getElementById(btn_guardar);
      if (guardarBtn.disabled) return;

      // Validate before disabling button
      if (document.getElementById(field_persona).value == '') {
        alert('¡Hay que elegir una persona!');
        return;
      }

      var personaId = document.getElementById(field_persona).value;

      // Check for outstanding debts
      DB.list('supercafe')
        .then((rows) => {
          var deudasCount = 0;
          var processed = 0;
          var total = rows.length;

          if (total === 0) {
            // No commands, proceed to save
            proceedToSave();
            return;
          }

          // Count debts for this person
          rows.forEach((row) => {
            TS_decrypt(
              row.data,
              SECRET,
              (data) => {
                if (data.Persona == personaId && data.Estado == 'Deuda') {
                  deudasCount++;
                }
                processed++;

                // When all rows are processed, check if we can save
                if (processed === total) {
                  if (deudasCount >= 3) {
                    toastr.error(
                      'Esta persona tiene más de 3 comandas en deuda. No se puede realizar el pedido.'
                    );
                    // Delete the comanda if it was created
                    if (mid) {
                      DB.del('supercafe', mid).then(() => {
                        setTimeout(() => {
                          setUrlHash('supercafe');
                        }, 1000);
                      });
                    }
                  } else {
                    proceedToSave();
                  }
                }
              },
              'supercafe',
              row.id
            );
          });
        })
        .catch((e) => {
          console.warn('Error checking debts', e);
          toastr.error('Error al verificar las deudas');
        });

      function proceedToSave() {
        // Disable button after validation passes
        guardarBtn.disabled = true;
        guardarBtn.style.opacity = '0.5';

        var data = {
          Fecha: document.getElementById(field_fecha).value,
          Persona: personaId,
          Comanda: JSON.stringify(currentData),
          Notas: document.getElementById(field_notas).value,
          Estado: document.getElementById(field_estado).value.replace('%%', 'Pedido'),
        };
        document.getElementById('actionStatus').style.display = 'block';
        DB.put('supercafe', mid, data)
          .then(() => {
            toastr.success('Guardado!');
            setTimeout(() => {
              document.getElementById('actionStatus').style.display = 'none';
              setUrlHash('supercafe');
            }, SAVE_WAIT);
          })
          .catch((e) => {
            console.warn('DB.put error', e);
            guardarBtn.disabled = false;
            guardarBtn.style.opacity = '1';
            document.getElementById('actionStatus').style.display = 'none';
            toastr.error('Error al guardar la comanda');
          });
      }
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (
        confirm(
          '¿Quieres borrar esta comanda? - NO se actualizará el monedero de la persona asignada.'
        ) == true
      ) {
        DB.del('supercafe', mid).then(() => {
          setTimeout(() => {
            setUrlHash('supercafe');
          }, SAVE_WAIT);
        });
      }
    };
  },
  index: function () {
    if (!checkRole('supercafe')) {
      setUrlHash('index');
      return;
    }
    var tts = false;
    var sc_nobtn = '';
    if (urlParams.get('sc_nobtn') == 'yes') {
      sc_nobtn = 'pointer-events: none; opacity: 0.5';
    }
    var ev = setTimeout(() => {
      tts = true;
      console.log('TTS Enabled');
      //toastr.info('Texto a voz disponible');
    }, 6500);
    EventListeners.Timeout.push(ev);
    const tablebody = safeuuid();
    const tablebody2 = safeuuid();
    var btn_new = safeuuid();
    var btn_cobro_auto = safeuuid();
    var totalprecio = safeuuid();
    var tts_check = safeuuid();
    var old = {};
    container.innerHTML = html`
      <h1><i class="fas fa-coffee"></i> Cafetería <span style="font-size: 20px; color: #666;">Total: <span id="${totalprecio}">0</span>c</span></h1>
      <button
        id="${btn_new}"
        style="font-size: 26px; background-color: #4CAF50; color: white; padding: 5px 10px; text-align: center; text-decoration: none; display: inline-block; margin: 4px 2px; cursor: pointer;"
      >
        <i class="fas fa-plus"></i> Nueva comanda
      </button>
      <button
        id="${btn_cobro_auto}"
        style="font-size: 26px; background-color: red; color: white; padding: 5px 10px; text-align: center; text-decoration: none; display: inline-block; margin: 4px 2px; cursor: pointer;"
      >
        <i class="fas fa-robot"></i> Cobro auto
      </button>
      <a
        class="button"
        href="#pagos,saldos"
        style="font-size: 26px; background-color: blue; color: white; padding: 5px 10px; text-align: center; text-decoration: none; display: inline-block; margin: 4px 2px; cursor: pointer;"
      >
        <i class="fas fa-coins"></i> Saldos
      </a>
      <a
        class="button"
        href="#pagos,datafono"
        style="font-size: 26px; background-color: purple; color: white; padding: 5px 10px; text-align: center; text-decoration: none; display: inline-block; margin: 4px 2px; cursor: pointer;"
        ><i class="fas fa-credit-card"></i> Datafono</a
      >
      <br />
      <label>
        <b>Avisos de voz:</b>
        <input type="checkbox" id="${tts_check}" style="height: 25px;width: 25px;" />
      </label>

      <div id="${tablebody}"></div>
      <div id="${tablebody2}"></div>
    `;
    document.getElementById(tts_check).checked =
      localStorage.getItem('TELESEC_TTS_ENABLED') === 'true';
    document.getElementById(tts_check).onchange = function () {
      localStorage.setItem('TELESEC_TTS_ENABLED', this.checked);
    };
    var config = [
      {
        key: 'Persona',
        type: 'persona',
        default: '',
        label: 'Persona',
      },
      {
        key: 'Estado',
        type: 'comanda-status',
        default: '',
        label: 'Estado',
      },
      {
        key: 'Comanda',
        type: 'comanda',
        default: '',
        label: 'Comanda',
      },
    ];
    if (!checkRole('supercafe:edit')) {
      config = [
        {
          key: 'Persona',
          type: 'persona',
          default: '',
          label: 'Persona',
        },
        {
          key: 'Comanda',
          type: 'comanda',
          default: '',
          label: 'Comanda',
        },
      ];
    }
    //Todas las comandas
    var comandasTot = {};
    function calcPrecio() {
      var tot = 0;
      Object.values(comandasTot).forEach((precio) => {
        tot += precio;
      });
      document.getElementById(totalprecio).innerText = tot;
      return tot;
    }
    var ttS_data = {};
    TS_IndexElement(
      'supercafe',
      config,
      'supercafe',
      document.getElementById(tablebody),
      (data, new_tr) => {
        // new_tr.style.backgroundColor = "#FFCCCB";
        comandasTot[data._key] = SC_priceCalc(JSON.parse(data.Comanda))[0];
        calcPrecio();
        if (data.Estado == 'Pedido') {
          new_tr.style.backgroundColor = '#FFFFFF';
        }
        if (data.Estado == 'En preparación') {
          new_tr.style.backgroundColor = '#FFCCCB';
        }
        if (data.Estado == 'Listo') {
          new_tr.style.backgroundColor = 'gold';
        }
        if (data.Estado == 'Entregado') {
          new_tr.style.backgroundColor = 'lightgreen';
        }
        if (data.Estado == 'Deuda') {
          new_tr.style.backgroundColor = '#f5d3ff';
        }
      },
      (data) => {
        if (data.Estado == 'Deuda') {
          return true;
        }
        var key = data._key;
        if (old[key] == undefined) {
          old[key] = '';
        }
        if (old[key] != data.Estado) {
          if (tts && document.getElementById(tts_check).checked) {
            if (ttS_data[data.Region] == undefined) {
              ttS_data[data.Region] = {};
            }
            ttS_data[data.Region][data._key] = data.Estado;
            var allReady = true;
            Object.values(ttS_data[data.Region]).forEach((estado) => {
              if (estado != 'Listo') {
                allReady = false;
              }
            });
            if (allReady) {
              var msgRegion = `Hola, ${SC_Personas[data.Persona].Region}. - Vamos a entregar vuestro pedido. ¡Que aproveche!`;
              TS_SayTTS(msgRegion);
            }
            if (data.Estado == 'Entregado') {
              var msgEntregado = `El pedido de ${SC_Personas[data.Persona].Nombre} en ${SC_Personas[data.Persona].Region} ha sido entregado.`;
              TS_SayTTS(msgEntregado);
            } else if (data.Estado == 'En preparación') {
              var msgPreparacion = `El pedido de ${SC_Personas[data.Persona].Nombre} en ${SC_Personas[data.Persona].Region} está en preparación.`;
              TS_SayTTS(msgPreparacion);
            } else if (data.Estado == 'Listo') {
              var msgListo = `El pedido de ${SC_Personas[data.Persona].Nombre} en ${SC_Personas[data.Persona].Region} está listo para ser entregado.`;
              TS_SayTTS(msgListo);
            } else if (data.Estado == 'Pedido') {
              var msgPedido = `Se ha realizado un nuevo pedido para ${SC_Personas[data.Persona].Nombre} en ${SC_Personas[data.Persona].Region}.`;
              TS_SayTTS(msgPedido);
            } else {
              var msg = `Comanda de ${SC_Personas[data.Persona].Region}. - ${
                JSON.parse(data.Comanda)['Selección']
              }. - ${SC_Personas[data.Persona].Nombre}. - ${data.Estado}`;
              TS_SayTTS(msg);
            }
          }
        }
        old[key] = data.Estado;
      },
      true,
      'Comandas',
      null
    );

    //Deudas
    TS_IndexElement(
      'supercafe',
      config,
      'supercafe',
      document.getElementById(tablebody2),
      (data, new_tr) => {
        // new_tr.style.backgroundColor = "#FFCCCB";
        comandasTot[data._key] = 0; // No mostrar comandas en deuda.
        calcPrecio();

        if (data.Estado == 'Pedido') {
          new_tr.style.backgroundColor = '#FFFFFF';
        }
        if (data.Estado == 'En preparación') {
          new_tr.style.backgroundColor = '#FFCCCB';
        }
        if (data.Estado == 'Listo') {
          new_tr.style.backgroundColor = 'gold';
        }
        if (data.Estado == 'Entregado') {
          new_tr.style.backgroundColor = 'lightgreen';
        }
        if (data.Estado == 'Deuda') {
          new_tr.style.backgroundColor = '#f5d3ff';
        }
      },
      (data) => {
        if (data.Estado != 'Deuda') {
          return true;
        }
        var key = data._key;
        if (old[key] == undefined) {
          old[key] = '';
        }
        if (old[key] != data.Estado) {
          if (tts && document.getElementById(tts_check).checked) {
            var msg = `La comanda de ${SC_Personas[data.Persona].Nombre} en ${SC_Personas[data.Persona].Region} ha pasado a deuda.`;
            TS_SayTTS(msg);
          }
        }
        old[key] = data.Estado;
      },
      true,
      'Deudas',
      null
    );
    if (!checkRole('supercafe:edit')) {
      document.getElementById(btn_new).style.display = 'none';
      document.getElementById(btn_cobro_auto).style.display = 'none';
    } else {
      document.getElementById(btn_new).onclick = () => {
        setUrlHash('supercafe,' + safeuuid(''));
      };

      document.getElementById(btn_cobro_auto).onclick = () => {
        if (!confirm('¿Cobrar automáticamente todas las comandas y deudas a quienes tengan saldo suficiente?')) return;

        DB.list('supercafe').then((rows) => {
          if (rows.length === 0) {
            toastr.info('No hay comandas pendientes.');
            return;
          }

          var pending = rows.length;
          var toCharge = []; // { id, data }

          rows.forEach((row) => {
            TS_decrypt(
              row.data,
              SECRET,
              (data) => {
                toCharge.push({ id: row.id, data: data });
                pending--;
                if (pending === 0) {
                  _ejecutarCobroAuto(toCharge);
                }
              },
              'supercafe',
              row.id
            );
          });
        }).catch((e) => {
          console.warn('Error listing supercafe', e);
          toastr.error('Error al obtener las comandas');
        });

        function _ejecutarCobroAuto(comandas) {
          var cobradas = 0;
          var sinSaldo = 0;
          var errores = 0;
          var totalCentimos = 0;
          var total = comandas.length;
          var done = 0;

          if (total === 0) {
            toastr.info('No hay comandas para cobrar.');
            return;
          }

          function checkDone() {
            done++;
            if (done === total) {
              toastr.success(
                `Cobro auto completado: ${cobradas} cobradas, ${sinSaldo} sin saldo suficiente, ${errores} errores.`,
                `Total cobrado: ${(totalCentimos / 100).toFixed(2)}€`
              );
            }
          }

          comandas.forEach(({ id, data }) => {
            var personaId = data.Persona;
            var persona = SC_Personas[personaId];
            if (!persona) {
              errores++;
              checkDone();
              return;
            }

            var estado = data.Estado;
            if (estado !== 'Entregado' && estado !== 'Deuda') {
              // Solo cobrar comandas que estén entregadas o en deuda
              checkDone();
              return;
            }

            var precio = 0;
            try {
              precio = SC_priceCalc(JSON.parse(data.Comanda || '{}'))[0] / 100; // Convertir de centavos a euros
            } catch (e) {
              errores++;
              checkDone();
              return;
            }

            var balance = parseFloat(persona.Monedero_Balance || 0);

            if (balance < precio) {
              // Not enough balance — mark as Deuda if not already
              if (data.Estado !== 'Deuda') {
                var updatedData = Object.assign({}, data, { Estado: 'Deuda' });
                DB.put('supercafe', id, updatedData).catch((e) => console.warn('Error updating deuda', e));
              }
              sinSaldo++;
              checkDone();
              return;
            }

            // Sufficient balance — charge
            persona.Monedero_Balance = parseFloat((balance - precio).toFixed(2));
            DB.put('personas', personaId, persona)
              .then(() => {
                // Save pagos transaction
                var ticketId = safeuuid('');
                var transactionData = {
                  Ticket: ticketId,
                  Fecha: CurrentISOTime(),
                  Tipo: 'Gasto',
                  Monto: precio,
                  Persona: personaId,
                  Metodo: 'Tarjeta',
                  Notas: 'Cobro auto - ' + (SC_parse(JSON.parse(data.Comanda || '{}')) || id),
                  Estado: 'Completado',
                  Origen: 'SuperCafé',
                  OrigenID: id,
                };
                return DB.put('pagos', ticketId, transactionData);
              })
              .then(() => {
                // Delete the supercafe comanda
                return DB.del('supercafe', id);
              })
              .then(() => {
                totalCentimos += precio * 100; // Guardar en centavos para evitar problemas de float
                cobradas++;
                checkDone();
              })
              .catch((e) => {
                console.warn('Error en cobro auto para', id, e);
                errores++;
                checkDone();
              });
          });
        }
      };
    }
  },
};
