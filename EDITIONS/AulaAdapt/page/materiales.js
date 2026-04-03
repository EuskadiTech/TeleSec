PERMS['materiales'] = 'Almacén';
PERMS['materiales:edit'] = '&gt; Editar';
PAGES.materiales = {
  navcss: 'btn2',
  icon: 'static/appico/shelf.png',
  faicon: 'fas fa-boxes',
  AccessControl: true,
  Title: 'Almacén',
  navItems: [
    { label: 'Ver materiales', hash: 'materiales', icon: 'fas fa-boxes' },
    { label: 'Nuevo material', hash: 'materiales,$nuevo$', icon: 'fas fa-plus-circle' },
  ],
  edit: function (mid) {
    if (!checkRole('materiales:edit')) {
      setUrlHash('materiales');
      return;
    }
    if (mid === '$nuevo$') {
      mid = safeuuid(""); // UID without html-safe prefix
    }
    var nameh1 = safeuuid();
    var field_nombre = safeuuid();
    var field_revision = safeuuid();
    var field_cantidad = safeuuid();
    var field_unidad = safeuuid();
    var field_cantidad_min = safeuuid();
    var field_ubicacion = safeuuid();
    var field_notas = safeuuid();
    var mov_tipo = safeuuid();
    var mov_cantidad = safeuuid();
    var mov_nota = safeuuid();
    var mov_btn = safeuuid();
    var mov_registro = safeuuid();
    var mov_chart = safeuuid();
    var mov_chart_canvas = safeuuid();
    var mov_open_modal_btn = safeuuid();
    var btn_print_chart = safeuuid();
    var mov_modal = safeuuid();
    var mov_modal_close = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    var FECHA_ISO = new Date().toISOString().split('T')[0];
    var movimientos = [];
    var movimientosChartInstance = null;

    function parseNum(v, fallback = 0) {
      var n = parseFloat(v);
      return Number.isFinite(n) ? n : fallback;
    }

    function buildMaterialData() {
      return {
        Nombre: document.getElementById(field_nombre).value,
        Unidad: document.getElementById(field_unidad).value,
        Cantidad: document.getElementById(field_cantidad).value,
        Cantidad_Minima: document.getElementById(field_cantidad_min).value,
        Ubicacion: document.getElementById(field_ubicacion).value,
        Revision: document.getElementById(field_revision).value,
        Notas: document.getElementById(field_notas).value,
        Movimientos: movimientos,
      };
    }

    function renderMovimientos() {
      var el = document.getElementById(mov_registro);
      if (!el) return;
      if (!movimientos.length) {
        el.innerHTML = '<small>Sin movimientos registrados.</small>';
        return;
      }

      var rows = movimientos
        .map((mov) => {
          var fecha = mov.Fecha ? new Date(mov.Fecha).toLocaleString('es-ES') : '-';
          return html`<tr>
            <td>${fecha}</td>
            <td>${mov.Tipo || '-'}</td>
            <td>${mov.Cantidad ?? '-'}</td>
            <td>${mov.Antes ?? '-'}</td>
            <td>${mov.Despues ?? '-'}</td>
            <td>${mov.Nota || ''}</td>
          </tr>`;
        })
        .join('');

      el.innerHTML = html`
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Antes</th>
              <th>Después</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }

    function renderMovimientosChart() {
      var el = document.getElementById(mov_chart);
      if (!el) return;

      if (movimientosChartInstance) {
        movimientosChartInstance.destroy();
        movimientosChartInstance = null;
      }

      if (!movimientos.length) {
        el.innerHTML = html`
          <h3 style="margin: 0 0 8px 0;">Historial de movimientos por fecha</h3>
          <small>Sin datos para graficar.</small>
        `;
        return;
      }

      var ordered = [...movimientos].sort((a, b) => {
        return new Date(a.Fecha || 0).getTime() - new Date(b.Fecha || 0).getTime();
      });

      var deltas = [];
      var labelsShort = [];

      ordered.forEach((mov) => {
        var cantidad = parseNum(mov.Cantidad, 0);
        var delta = 0;
        if (mov.Tipo === 'Entrada') {
          delta = cantidad;
        } else if (mov.Tipo === 'Salida') {
          delta = -cantidad;
        } else {
          var antes = parseNum(mov.Antes, 0);
          var despues = parseNum(mov.Despues, antes);
          delta = despues - antes;
        }
        deltas.push(Number(delta.toFixed(2)));

        var fechaTxt = mov.Fecha ? new Date(mov.Fecha).toLocaleString('es-ES') : '-';
        labelsShort.push(fechaTxt);
      });

      var currentStock = parseNum(document.getElementById(field_cantidad)?.value, 0);
      var totalNeto = deltas.reduce((acc, n) => acc + n, 0);
      var stockInicialInferido = currentStock - totalNeto;

      if (ordered.length > 0 && Number.isFinite(parseNum(ordered[0].Antes, NaN))) {
        stockInicialInferido = parseNum(ordered[0].Antes, stockInicialInferido);
      }

      var acumulado = stockInicialInferido;
      var values = deltas.map((neto) => {
        acumulado += neto;
        return Number(acumulado.toFixed(2));
      });

      el.innerHTML = html`
        <h3 style="margin: 0 0 8px 0;">Historial de movimientos por fecha</h3>
        <small style="display: block;margin-bottom: 6px;">Stock por fecha (cierre diario)</small>
        <canvas id="${mov_chart_canvas}" style="width: 100%;height: 280px;"></canvas>
      `;

      if (typeof Chart === 'undefined') {
        el.innerHTML += '<small>No se pudo cargar la librería de gráficos.</small>';
        return;
      }

      var chartCanvasEl = document.getElementById(mov_chart_canvas);
      if (!chartCanvasEl) return;

      movimientosChartInstance = new Chart(chartCanvasEl, {
        type: 'line',
        data: {
          labels: labelsShort,
          datasets: [
            {
              label: 'Stock diario',
              data: values,
              borderColor: '#2d7ef7',
              backgroundColor: 'rgba(45,126,247,0.16)',
              fill: true,
              tension: 0.25,
              pointRadius: 3,
              pointHoverRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              display: false,
            },
            y: {
              title: {
                display: false,
                text: 'Stock',
              },
              grace: '10%',
            },
          },
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              enabled: false,
            },
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false,
          },
        },
      });
    }

    container.innerHTML = html`
      <h1>Material <code id="${nameh1}"></code></h1>
      <fieldset style="width: 100%;max-width: 980px;box-sizing: border-box;">
        <div style="display: flex;flex-wrap: wrap;gap: 10px 16px;align-items: flex-end;">
          <div style="display: flex;flex-direction: column;align-items: stretch;gap: 6px;min-width: 220px;flex: 1 1 280px;">
            <label for="${field_revision}">Fecha Revisión</label>
            <input type="date" id="${field_revision}" style="flex: 1;" />
          </div>

          <div style="display: flex;flex-direction: column;align-items: stretch;gap: 6px;min-width: 220px;flex: 1 1 280px;">
            <label for="${field_nombre}">Nombre</label>
            <input type="text" id="${field_nombre}" style="flex: 1;" />
          </div>

          <div style="display: flex;flex-direction: column;align-items: stretch;gap: 6px;min-width: 220px;flex: 1 1 280px;">
            <label for="${field_ubicacion}">Ubicación</label>
            <input
              type="text"
              id="${field_ubicacion}"
              value="-"
              list="${field_ubicacion}_list"
              style="flex: 1;"
            />
            <datalist id="${field_ubicacion}_list"></datalist>
          </div>

          <div style="display: flex;flex-direction: column;align-items: stretch;gap: 6px;min-width: 220px;flex: 1 1 280px;">
            <label for="${field_unidad}">Unidad</label>
            <select id="${field_unidad}" style="flex: 1;">
              <option value="unidad(es)">unidad(es)</option>
              <option value="paquete(s)">paquete(s)</option>
              <option value="caja(s)">caja(s)</option>
              <option value="rollo(s)">rollo(s)</option>
              <option value="bote(s)">bote(s)</option>

              <option value="metro(s)">metro(s)</option>
              <option value="litro(s)">litro(s)</option>
              <option value="kg">kg</option>
            </select>
          </div>

          <div style="display: flex;flex-direction: column;align-items: stretch;gap: 6px;min-width: 220px;flex: 1 1 280px;">
            <label for="${field_cantidad}">Cantidad Actual</label>
            <input type="number" step="0.5" id="${field_cantidad}" style="flex: 1;" disabled />
          </div>

          <div style="display: flex;flex-direction: column;align-items: stretch;gap: 6px;min-width: 220px;flex: 1 1 280px;">
            <label for="${field_cantidad_min}">Cantidad Minima</label>
            <input type="number" step="0.5" id="${field_cantidad_min}" style="flex: 1;" />
          </div>

          <label style="display: flex;flex-direction: column;gap: 6px;min-width: 220px;flex: 1 1 100%;">
              Notas
              <textarea id="${field_notas}"></textarea>
          </label>
        </div>

        <div
          id="${mov_modal}"
          style="display: none;position: fixed;z-index: 9999;left: 0;top: 0;width: 100%;height: 100%;overflow: auto;background: rgba(0,0,0,0.45);"
        >
          <div
            style="background: #fff;margin: 2vh auto;padding: 14px;border: 1px solid #888;width: min(960px, 96vw);max-height: 94vh;overflow: auto;border-radius: 8px;box-sizing: border-box;"
          >
            <div style="display: flex;justify-content: space-between;align-items: center;gap: 10px;">
              <h3 style="margin: 0;">Realizar movimiento</h3>
              <button type="button" id="${mov_modal_close}" class="rojo">Cerrar</button>
            </div>

            <div style="margin-top: 12px;display: flex;gap: 10px;align-items: flex-end;flex-wrap: wrap;">
              <div style="display: flex;flex-wrap: wrap;gap: 10px 12px;align-items: flex-end;flex: 1 1 420px;">
                <div style="display: flex;flex-direction: column;align-items: stretch;gap: 6px;min-width: 180px;flex: 1 1 220px;">
                  <label for="${mov_tipo}">Tipo</label>
                  <select id="${mov_tipo}" style="flex: 1;">
                    <option value="Entrada">Entrada - Meter al almacen</option>
                    <option value="Salida">Salida - Sacar del almacen</option>
                    <option value="Ajuste">Ajuste - Existencias actuales</option>
                  </select>
                </div>
                <div style="display: flex;flex-direction: column;align-items: stretch;gap: 6px;min-width: 180px;flex: 1 1 220px;">
                  <label for="${mov_cantidad}">Cantidad</label>
                  <input type="number" step="0.5" id="${mov_cantidad}" style="flex: 1;" />
                </div>
                <div style="display: flex;flex-direction: column;align-items: stretch;gap: 6px;min-width: 180px;flex: 1 1 220px;">
                  <label for="${mov_nota}">Nota</label>
                  <input type="text" id="${mov_nota}" style="flex: 1;" placeholder="Motivo del movimiento" />
                </div>
              </div>
              <div style="display: flex;justify-content: flex-end;flex: 1 1 120px;min-width: 120px;">
                <button type="button" class="saveico" id="${mov_btn}">
                  <img src="static/floppy_disk_green.png" />
                  <br>Guardar
                </button>
              </div>
            </div>

            <h4 style="margin: 14px 0 6px 0;">Registro de movimientos</h4>
            <div id="${mov_registro}"></div>
          </div>
        </div>

        <hr />
        <button class="saveico" id="${btn_guardar}">
          <img src="static/floppy_disk_green.png" />
          <br>Guardar
        </button>
        <button class="delico" id="${btn_borrar}">
          <img src="static/garbage.png" />
          <br>Borrar
        </button>
        <button class="opicon" id="${mov_open_modal_btn}">
          <img src="static/exchange.png" />
          <br>Movimientos
        </button>
        <button class="opicon" onclick="setUrlHash('materiales')" style="float: right;"> <!-- Align to the right -->
          <img src="static/exit.png" />
          <br>Salir
        </button>
        <button class="opicon" onclick="window.print()" style="float: right;"> <!-- Align to the right -->
          <img src="static/printer2.png" />
          <br>Imprimir
        </button>
      </fieldset>
      <div id="${mov_chart}" style="max-width: 980px;width: 100%;margin-top: 14px;min-height: 260px;height: min(400px, 52vh);"></div>
    `;
    // Cargar ubicaciones existentes para autocompletar
    DB.map('materiales', (data) => {
      if (!data) return;
      function addUbicacion(d) {
        const ubicacion = d.Ubicacion || '-';
        const datalist = document.getElementById(`${field_ubicacion}_list`);
        if (!datalist) {
          console.warn(`Element with ID "${field_ubicacion}_list" not found.`);
          return;
        }
        const optionExists = Array.from(datalist.options).some((opt) => opt.value === ubicacion);
        if (!optionExists) {
          const option = document.createElement('option');
          option.value = ubicacion;
          datalist.appendChild(option);
        }
      }
      if (typeof data === 'string') {
        TS_decrypt(
          data,
          SECRET,
          (data, wasEncrypted) => {
            if (data && typeof data === 'object') {
              addUbicacion(data);
            }
          },
          'materiales',
          mid
        );
      } else {
        addUbicacion(data);
      }
    });

    // Cargar datos del material
    DB.get('materiales', mid).then((data) => {
      function load_data(data, ENC = '') {
        document.getElementById(nameh1).innerText = mid;
        document.getElementById(field_nombre).value = data['Nombre'] || '';
        document.getElementById(field_unidad).value = data['Unidad'] || 'unidad(es)';
        document.getElementById(field_cantidad).value = data['Cantidad'] || '';
        document.getElementById(field_cantidad_min).value = data['Cantidad_Minima'] || '';
        document.getElementById(field_ubicacion).value = data['Ubicacion'] || '-';
        document.getElementById(field_revision).value = data['Revision'] || '-';
        document.getElementById(field_notas).value = data['Notas'] || '';
        movimientos = Array.isArray(data['Movimientos']) ? data['Movimientos'] : [];
        renderMovimientos();
        renderMovimientosChart();
      }
      if (typeof data == 'string') {
        TS_decrypt(
          data,
          SECRET,
          (data, wasEncrypted) => {
            load_data(data, '%E');
          },
          'materiales',
          mid
        );
      } else {
        load_data(data || {});
      }
    });

    document.getElementById(mov_open_modal_btn).onclick = () => {
      document.getElementById(mov_modal).style.display = 'block';
      renderMovimientos();
    };

    document.getElementById(mov_modal_close).onclick = () => {
      document.getElementById(mov_modal).style.display = 'none';
    };

    document.getElementById(mov_modal).onclick = (evt) => {
      if (evt.target.id === mov_modal) {
        document.getElementById(mov_modal).style.display = 'none';
      }
    };

    document.getElementById(mov_btn).onclick = () => {
      var btn = document.getElementById(mov_btn);
      if (btn.disabled) return;

      var tipo = document.getElementById(mov_tipo).value;
      var cantidadMov = parseNum(document.getElementById(mov_cantidad).value, NaN);
      var nota = document.getElementById(mov_nota).value || '';
      var actual = parseNum(document.getElementById(field_cantidad).value, 0);

      if ((!Number.isFinite(cantidadMov) || cantidadMov <= 0) && tipo !== 'Ajuste') {
        toastr.warning('Indica una cantidad válida para el movimiento');
        return;
      }

      var nuevaCantidad = actual;
      if (tipo === 'Entrada') {
        nuevaCantidad = actual + cantidadMov;
      } else if (tipo === 'Salida') {
        nuevaCantidad = actual - cantidadMov;
      } else if (tipo === 'Ajuste') {
        nuevaCantidad = cantidadMov;
      }

      movimientos.unshift({
        Fecha: new Date().toISOString(),
        Tipo: tipo,
        Cantidad: cantidadMov,
        Antes: actual,
        Despues: nuevaCantidad,
        Nota: nota,
      });

      document.getElementById(field_cantidad).value = nuevaCantidad;
      document.getElementById(field_revision).value = FECHA_ISO;
      document.getElementById(mov_cantidad).value = '';
      document.getElementById(mov_nota).value = '';
      renderMovimientos();
      renderMovimientosChart();

      btn.disabled = true;
      btn.style.opacity = '0.5';
      document.getElementById('actionStatus').style.display = 'block';
      DB.put('materiales', mid, buildMaterialData())
        .then(() => {
          toastr.success('Movimiento registrado');
        })
        .catch((e) => {
          console.warn('DB.put error', e);
          toastr.error('Error al guardar el movimiento');
        })
        .finally(() => {
          btn.disabled = false;
          btn.style.opacity = '1';
          document.getElementById('actionStatus').style.display = 'none';
        });
    };

    document.getElementById(btn_guardar).onclick = () => {
      // Disable button to prevent double-clicking
      var guardarBtn = document.getElementById(btn_guardar);
      if (guardarBtn.disabled) return;

      guardarBtn.disabled = true;
      guardarBtn.style.opacity = '0.5';

      var data = buildMaterialData();
      document.getElementById('actionStatus').style.display = 'block';
      DB.put('materiales', mid, data)
        .then(() => {
          toastr.success('Guardado!');
          setTimeout(() => {
            document.getElementById('actionStatus').style.display = 'none';
            setUrlHash('materiales');
          }, SAVE_WAIT);
        })
        .catch((e) => {
          console.warn('DB.put error', e);
          guardarBtn.disabled = false;
          guardarBtn.style.opacity = '1';
          document.getElementById('actionStatus').style.display = 'none';
          toastr.error('Error al guardar el material');
        });
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (confirm('¿Quieres borrar este material?') == true) {
        DB.del('materiales', mid).then(() => {
          toastr.error('Borrado!');
          setTimeout(() => {
            setUrlHash('materiales');
          }, SAVE_WAIT);
        });
      }
    };
  },
  index: function () {
    if (!checkRole('materiales')) {
      setUrlHash('index');
      return;
    }
    var btn_new = safeuuid();
    var select_ubicacion = safeuuid();
    var check_lowstock = safeuuid();
    var tableContainer = safeuuid();
    container.innerHTML = html`
      <h1>Materiales del Almacén</h1>
      <label>
        <b>Solo lo que falta:</b>
        <input type="checkbox" id="${check_lowstock}" style="height: 25px;width: 25px;" /> </label
      ><br />
      <label
        >Filtrar por ubicación:
        <select id="${select_ubicacion}">
          <option value="">(Todas)</option>
        </select>
      </label>
      <button id="${btn_new}">Nuevo Material</button>
      <div id="${tableContainer}"></div>
    `;

    const config = [
      { key: 'Revision', label: 'Ult. Revisión', type: 'fecha-diff', default: '' },
      { key: 'Nombre', label: 'Nombre', type: 'text', default: '' },
      { key: 'Ubicacion', label: 'Ubicación', type: 'text', default: '--' },
      {
        key: 'Cantidad',
        label: 'Cantidad',
        type: 'template',
        template: (data, element) => {
          const min = parseFloat(data.Cantidad_Minima);
          const act = parseFloat(data.Cantidad);
          const sma = act < min ? `<small>- min. ${data.Cantidad_Minima || '?'}</small>` : '';
          element.innerHTML = html`${data.Cantidad || '?'} ${data.Unidad || '?'} ${sma}`;
        },
        default: '?',
      },
      { key: 'Notas', label: 'Notas', type: 'text', default: '' },
    ];

    // Obtener todas las ubicaciones únicas y poblar el <select>, desencriptando si es necesario
    DB.map('materiales', (data, key) => {
      try {
        if (!data) return;

        function addUbicacion(d) {
          const ubicacion = d.Ubicacion || '-';
          const select = document.getElementById(select_ubicacion);

          if (!select) {
            console.warn(`Element with ID "${select_ubicacion}" not found.`);
            return;
          }

          const optionExists = Array.from(select.options).some((opt) => opt.value === ubicacion);
          if (!optionExists) {
            const option = document.createElement('option');
            option.value = ubicacion;
            option.textContent = ubicacion;
            select.appendChild(option);
          }
        }

        if (typeof data === 'string') {
          TS_decrypt(
            data,
            SECRET,
            (dec, wasEncrypted) => {
              if (dec && typeof dec === 'object') {
                addUbicacion(dec);
              }
            },
            'materiales',
            key
          );
        } else {
          addUbicacion(data);
        }
      } catch (error) {
        console.warn('Error processing ubicacion:', error);
      }
    });

    // Función para renderizar la tabla filtrada
    function renderTable(filtroUbicacion) {
      TS_IndexElement(
        'materiales',
        config,
        'materiales',
        document.getElementById(tableContainer),
        function (data, new_tr) {
          if (parseFloat(data.Cantidad) < parseFloat(data.Cantidad_Minima)) {
            new_tr.style.background = '#fcfcb0';
          }
          if (parseFloat(data.Cantidad) <= 0) {
            new_tr.style.background = '#ffc0c0';
          }
          if ((data.Cantidad || '?') == '?') {
            new_tr.style.background = '#d0d0ff';
          }
          if ((data.Revision || '?') == '?') {
            new_tr.style.background = '#d0d0ff';
          }
        },
        function (data) {
          var is_low_stock =
            !document.getElementById(check_lowstock).checked ||
            parseFloat(data.Cantidad) < parseFloat(data.Cantidad_Minima);

          var is_region = filtroUbicacion === '' || data.Ubicacion === filtroUbicacion;

          return !(is_low_stock && is_region);
        }
      );
    }

    // Inicializar tabla sin filtro
    renderTable('');

    // Evento para filtrar por ubicación
    document.getElementById(select_ubicacion).onchange = function () {
      renderTable(this.value);
    };
    // Recargar al cambiar filtro
    document.getElementById(check_lowstock).onchange = function () {
      renderTable(document.getElementById(select_ubicacion).value);
    };

    if (!checkRole('materiales:edit')) {
      document.getElementById(btn_new).style.display = 'none';
    } else {
      document.getElementById(btn_new).onclick = () => {
        setUrlHash('materiales,' + safeuuid(''));
      };
    }
  },
};
