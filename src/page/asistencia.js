PERMS['asistencia'] = 'Asistencia';
PERMS['asistencia:esalumno'] = '> Es alumno';

PAGES.asistencia = {
  Title: 'Asistencia',
  icon: 'static/appico/face_scan.png',
  AccessControl: true,
  index: function () {
    if (!checkRole('asistencia')) {
      setUrlHash('index');
      return;
    }

    var field_desde = safeuuid();
    var field_hasta = safeuuid();
    var btn_hoy = safeuuid();
    var btn_semana = safeuuid();
    var btn_mes = safeuuid();
    var btn_aplicar = safeuuid();
    var view_root = safeuuid();

    container.innerHTML = html`
      <h1>Asistencia</h1>
      <fieldset style="width: 100%; max-width: 1200px; box-sizing: border-box;">
        <legend>Rango de fechas</legend>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: end;">
          <label style="display: flex; flex-direction: column; gap: 4px;">
            Desde
            <input type="date" id="${field_desde}">
          </label>
          <label style="display: flex; flex-direction: column; gap: 4px;">
            Hasta
            <input type="date" id="${field_hasta}">
          </label>
          <button type="button" id="${btn_hoy}">Hoy</button>
          <button type="button" id="${btn_semana}" class="btn5">Semana</button>
          <button type="button" id="${btn_mes}" class="btn6">Mes</button>
          <button type="button" id="${btn_aplicar}" class="btn2">Aplicar</button>
        </div>
      </fieldset>
      <div id="${view_root}"></div>
    `;

    var state = {
      personas: {},
      asistencia: {},
      fotos: {},
      fotosInFlight: {},
      renderTimer: null,
    };

    const ESTADOS = ['/', 'Presente', 'Ausente', 'Tarde', 'Justificada'];
    const FOTO_DEFAULT = 'static/ico/user_generic.png';

    function toDateInputValue(d) {
      return d.toISOString().slice(0, 10);
    }

    function mondayOf(dateObj) {
      const d = new Date(dateObj);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      return d;
    }

    function plusDays(dateObj, n) {
      const d = new Date(dateObj);
      d.setDate(d.getDate() + n);
      return d;
    }

    function parseRoles(raw) {
      return String(raw || '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    }

    function isAlumno(persona) {
      return parseRoles(persona && persona.Roles).includes('asistencia:esalumno');
    }

    function decryptDataIfNeeded(table, id, data) {
      return new Promise((resolve) => {
        if (typeof data !== 'string') {
          resolve(data || {});
          return;
        }
        try {
          TS_decrypt(
            data,
            SECRET,
            function (decoded) {
              resolve(decoded || {});
            },
            table,
            id
          );
        } catch (e) {
          resolve({});
        }
      });
    }

    function asistenciaDocId(personaId, fecha) {
      return fecha + ':' + personaId;
    }

    function dateList(fromStr, toStr) {
      if (!fromStr || !toStr) return [];
      const out = [];
      const start = new Date(fromStr + 'T00:00:00');
      const end = new Date(toStr + 'T00:00:00');
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
      const cursor = new Date(start);
      while (cursor <= end) {
        out.push(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
      }
      return out;
    }

    function scheduleRender() {
      if (state.renderTimer) return;
      state.renderTimer = setTimeout(function () {
        state.renderTimer = null;
        render();
      }, 120);
    }

    function groupedAlumnos() {
      const groups = {};
      Object.keys(state.personas).forEach((pid) => {
        const p = state.personas[pid] || {};
        if (!isAlumno(p)) return;
        const aula = (p.Region || 'Sin aula').trim() || 'Sin aula';
        if (!groups[aula]) groups[aula] = [];
        groups[aula].push({ id: pid, data: p });
      });

      Object.keys(groups).forEach((aula) => {
        groups[aula].sort((a, b) => {
          const na = String(a.data.Nombre || a.id).toLowerCase();
          const nb = String(b.data.Nombre || b.id).toLowerCase();
          return na < nb ? -1 : na > nb ? 1 : 0;
        });
      });

      return groups;
    }

    function saveEstado(personaId, fecha, aula, estado) {
      const did = asistenciaDocId(personaId, fecha);
      const payload = {
        Persona: personaId,
        Fecha: fecha,
        Aula: aula,
        Estado: estado,
      };
      state.asistencia[did] = payload;
      DB.put('asistencia', did, payload).catch((e) => {
        console.warn('Error guardando asistencia', e);
        toastr.error('No se pudo guardar la asistencia');
      });
    }

    function ensureFoto(personaId) {
      if (!personaId) return;
      if (state.fotos[personaId]) return;
      if (state.fotosInFlight[personaId]) return;

      state.fotosInFlight[personaId] = true;
      DB.getAttachment('personas', personaId, 'foto')
        .then((durl) => {
          state.fotos[personaId] = durl || FOTO_DEFAULT;
        })
        .catch(() => {
          state.fotos[personaId] = FOTO_DEFAULT;
        })
        .finally(() => {
          delete state.fotosInFlight[personaId];
          scheduleRender();
        });
    }

    function getFoto(personaId) {
      return state.fotos[personaId] || FOTO_DEFAULT;
    }

    function render() {
      const root = document.getElementById(view_root);
      if (!root) return;

      const desde = document.getElementById(field_desde).value;
      const hasta = document.getElementById(field_hasta).value;
      const fechas = dateList(desde, hasta);
      if (!fechas.length) {
        root.innerHTML = '<p><b>Selecciona un rango de fechas válido.</b></p>';
        return;
      }
      if (fechas.length > 45) {
        root.innerHTML = '<p><b>El rango es demasiado grande. Máximo 45 días.</b></p>';
        return;
      }

      const groups = groupedAlumnos();
      const aulas = Object.keys(groups).sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1));

      if (!aulas.length) {
        root.innerHTML =
          '<p>No hay alumnos con el permiso <code>asistencia:esalumno</code>.</p>';
        return;
      }

      let htmlOut = '';
      htmlOut += '<table style="min-width: 100%; border-collapse: collapse;">';
      aulas.forEach((aula) => {
        htmlOut += `<tr><td colspan="${fechas.length + 1}" style="background: #000; color: #fff; padding: 8px; font-size: 26px;"><b>${escapeHtml(aula)}</b></td></tr>`;
        htmlOut += '<tr style="background: #000; color: #fff;">';
        htmlOut +=
          '<th style="position: sticky; left: 0; background: #000; color: #fff; min-width: 210px; border-bottom: 1px solid #ddd; padding: 8px;">Alumno</th>';
        fechas.forEach((f) => {
          var fecha_parsed = new Date(f + 'T00:00:00');
          var fecha_formatted = fecha_parsed.toLocaleDateString("es-ES", {
            weekday: 'short',
            day: '2-digit',
          });
          htmlOut += `<th style="border-bottom: 1px solid #ddd; padding: 8px; white-space: nowrap;">${fecha_formatted}</th>`;
        });
        htmlOut += '</tr>';

        groups[aula].forEach((row) => {
          const nombre = row.data.Nombre || row.id;
          ensureFoto(row.id);
          const foto = getFoto(row.id);
          var imgTag = `<img src="${foto}" height="75px" style="margin-right: 8px; vertical-align: middle;">`;
          htmlOut += '<tr>';
          htmlOut +=
            `<td style="position: sticky; left: 0; border-bottom: 1px solid #eee; padding: 8px;">${imgTag}<b>${escapeHtml(nombre)}</b></td>`;
          fechas.forEach((f) => {
            const did = asistenciaDocId(row.id, f);
            const estado = (state.asistencia[did] && state.asistencia[did].Estado) || '/';
            htmlOut +=
              `<td style="border-bottom: 1px solid #eee; padding: 6px;"><select data-persona="${escapeHtmlAttr(row.id)}" data-fecha="${f}" data-aula="${escapeHtmlAttr(aula)}" style="min-width: 120px;">` +
              ESTADOS.map((op) => `<option value="${op}" ${op === estado ? 'selected' : ''}>${op}</option>`).join('') +
              '</select></td>';
          });
          htmlOut += '</tr>';
        });
      });
      htmlOut += '</tbody></table></div>';

      root.innerHTML = htmlOut;
      root.querySelectorAll('select[data-persona]').forEach((el) => {
        el.addEventListener('change', function () {
          const personaId = this.getAttribute('data-persona');
          const fecha = this.getAttribute('data-fecha');
          const aula = this.getAttribute('data-aula');
          const estado = this.value;
          saveEstado(personaId, fecha, aula, estado);
        });
      });

      tableScroll('#' + view_root + ' table');
    }

    function escapeHtml(text) {
      return String(text || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function escapeHtmlAttr(text) {
      return escapeHtml(text).replaceAll('`', '&#096;');
    }

    function setQuickRange(type) {
      const today = new Date();
      if (type === 'hoy') {
        const d = toDateInputValue(today);
        document.getElementById(field_desde).value = d;
        document.getElementById(field_hasta).value = d;
        scheduleRender();
        return;
      }
      if (type === 'semana') {
        const mon = mondayOf(today);
        const sun = plusDays(mon, 6);
        document.getElementById(field_desde).value = toDateInputValue(mon);
        document.getElementById(field_hasta).value = toDateInputValue(sun);
        scheduleRender();
        return;
      }

      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      document.getElementById(field_desde).value = toDateInputValue(first);
      document.getElementById(field_hasta).value = toDateInputValue(last);
      scheduleRender();
    }

    Promise.all([DB.list('personas'), DB.list('asistencia')])
      .then(async ([personasRows, asistenciaRows]) => {
        for (const row of personasRows || []) {
          const decoded = await decryptDataIfNeeded('personas', row.id, row.data);
          state.personas[row.id] = decoded || {};
        }
        for (const row of asistenciaRows || []) {
          const decoded = await decryptDataIfNeeded('asistencia', row.id, row.data);
          state.asistencia[row.id] = decoded || {};
        }
        setQuickRange('semana');
      })
      .catch((e) => {
        console.warn('Error cargando asistencia', e);
        toastr.error('No se pudieron cargar los datos de asistencia');
      });

    EventListeners.DB.push(
      DB.map('personas', (data, key) => {
        function apply(decoded) {
          if (!decoded) {
            delete state.personas[key];
          } else {
            state.personas[key] = decoded;
          }
          scheduleRender();
        }
        if (typeof data === 'string') {
          TS_decrypt(data, SECRET, (decoded) => apply(decoded || {}), 'personas', key);
        } else {
          apply(data);
        }
      })
    );

    EventListeners.DB.push(
      DB.map('asistencia', (data, key) => {
        function apply(decoded) {
          if (!decoded) {
            delete state.asistencia[key];
          } else {
            state.asistencia[key] = decoded;
          }
          scheduleRender();
        }
        if (typeof data === 'string') {
          TS_decrypt(data, SECRET, (decoded) => apply(decoded || {}), 'asistencia', key);
        } else {
          apply(data);
        }
      })
    );

    document.getElementById(btn_hoy).onclick = function () {
      setQuickRange('hoy');
    };
    document.getElementById(btn_semana).onclick = function () {
      setQuickRange('semana');
    };
    document.getElementById(btn_mes).onclick = function () {
      setQuickRange('mes');
    };
    document.getElementById(btn_aplicar).onclick = function () {
      scheduleRender();
    };
    document.getElementById(field_desde).addEventListener('change', scheduleRender);
    document.getElementById(field_hasta).addEventListener('change', scheduleRender);
  },
};
