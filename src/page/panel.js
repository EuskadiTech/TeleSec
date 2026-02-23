PERMS['panel'] = 'Panel';
PAGES.panel = {
  navcss: 'btn2',
  icon: 'static/appico/calendar.png',
  AccessControl: true,
  Title: 'Panel',

  index: function () {
    if (!checkRole('panel')) {
      setUrlHash('index');
      return;
    }

    var contentId = safeuuid();
    container.innerHTML = html`
      <h1>Panel de acogida del día</h1>
      <p>Quiz de aprendizaje con retroalimentación para empezar la jornada.</p>
      <div id="${contentId}">Cargando datos del día...</div>
    `;

    PAGES.panel
      .__buildDailyContext()
      .then((ctx) => {
        var questions = PAGES.panel.__buildQuestions(ctx);
        PAGES.panel.__renderQuiz(contentId, ctx, questions);
      })
      .catch((e) => {
        console.warn('Panel load error', e);
        document.getElementById(contentId).innerHTML =
          '<b>No se pudo cargar el Panel ahora mismo.</b>';
      });
  },

  __decryptIfNeeded: function (table, id, raw) {
    return new Promise((resolve) => {
      if (typeof raw !== 'string') {
        resolve(raw || {});
        return;
      }
      TS_decrypt(
        raw,
        SECRET,
        (data) => {
          resolve(data || {});
        },
        table,
        id
      );
    });
  },

  __getTodayComedor: async function () {
    var rows = await DB.list('comedor');
    var today = CurrentISODate();
    var items = [];

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var data = await PAGES.panel.__decryptIfNeeded('comedor', row.id, row.data);
      if ((data.Fecha || '') === today) {
        items.push(data);
      }
    }

    if (items.length === 0) {
      return {
        Primero: '',
        Segundo: '',
        Postre: '',
        Tipo: '',
      };
    }

    items.sort((a, b) => {
      var ta = (a.Tipo || '').toLowerCase();
      var tb = (b.Tipo || '').toLowerCase();
      return ta < tb ? -1 : 1;
    });

    return items[0] || {};
  },

  __getNotaById: async function (id) {
    var data = await DB.get('notas', id);
    if (!data) return {};
    return await PAGES.panel.__decryptIfNeeded('notas', id, data);
  },

  __getDiarioHoy: async function () {
    var did = 'diario-' + CurrentISODate();
    var data = await DB.get('aulas_informes', did);
    if (!data) return {};
    return await PAGES.panel.__decryptIfNeeded('aulas_informes', did, data);
  },

  __extractFirstLine: function (text) {
    var lines = String(text || '')
      .split('\n')
      .map((x) => x.trim())
      .filter((x) => x !== '');
    return lines[0] || '';
  },

  __buildDailyContext: async function () {
    var comedor = await PAGES.panel.__getTodayComedor();
    var tareas = await PAGES.panel.__getNotaById('tareas');
    var diario = await PAGES.panel.__getDiarioHoy();

    var planHoy =
      PAGES.panel.__extractFirstLine(tareas.Contenido) ||
      PAGES.panel.__extractFirstLine(diario.Contenido) ||
      'Revisar rutinas, colaborar y participar en las actividades del aula.';

    return {
      fecha: CurrentISODate(),
      comedor: {
        primero: (comedor.Primero || '').trim(),
        segundo: (comedor.Segundo || '').trim(),
        postre: (comedor.Postre || '').trim(),
        tipo: (comedor.Tipo || '').trim(),
      },
      planHoy: planHoy,
    };
  },

  __pickDistractors: function (correct, pool, count) {
    var options = [];
    var seen = {};
    var cleanCorrect = (correct || '').trim();

    pool.forEach((item) => {
      var text = String(item || '').trim();
      if (text === '' || text === cleanCorrect || seen[text]) return;
      seen[text] = true;
      options.push(text);
    });

    var out = [];
    for (var i = 0; i < options.length && out.length < count; i++) {
      out.push(options[i]);
    }

    while (out.length < count) {
      out.push('No aplica hoy');
    }

    return out;
  },

  __shuffle: function (arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  },

  __buildQuestions: function (ctx) {
    var c = ctx.comedor || {};
    var poolComedor = [c.primero, c.segundo, c.postre, 'No hay menú registrado'];
    var questions = [];

    if (c.primero) {
      var opts1 = [c.primero].concat(PAGES.panel.__pickDistractors(c.primero, poolComedor, 3));
      questions.push({
        id: 'q-comida-primero',
        text: '¿Qué hay de comer hoy de primero?',
        options: PAGES.panel.__shuffle(opts1),
        correct: c.primero,
        ok: '¡Correcto! Ya sabes el primer plato de hoy.',
        bad: 'Repasa el menú del día para anticipar la comida.',
      });
    }

    if (c.segundo) {
      var opts2 = [c.segundo].concat(PAGES.panel.__pickDistractors(c.segundo, poolComedor, 3));
      questions.push({
        id: 'q-comida-segundo',
        text: '¿Y de segundo, qué toca?',
        options: PAGES.panel.__shuffle(opts2),
        correct: c.segundo,
        ok: '¡Bien! Segundo identificado.',
        bad: 'Casi. Mira el módulo Comedor para recordar el segundo plato.',
      });
    }

    if (c.postre) {
      var opts3 = [c.postre].concat(PAGES.panel.__pickDistractors(c.postre, poolComedor, 3));
      questions.push({
        id: 'q-comida-postre',
        text: '¿Cuál es el postre de hoy?',
        options: PAGES.panel.__shuffle(opts3),
        correct: c.postre,
        ok: '¡Perfecto! Postre acertado.',
        bad: 'No pasa nada, revisa el postre en el menú diario.',
      });
    }

    var plan = ctx.planHoy || '';
    var distractPlan = [
      'No hay actividades planificadas hoy',
      'Solo descanso todo el día',
      'Actividad libre sin objetivos',
    ];
    var planOptions = [plan].concat(PAGES.panel.__pickDistractors(plan, distractPlan, 3));
    questions.push({
      id: 'q-plan-hoy',
      text: '¿Qué vamos a hacer hoy?',
      options: PAGES.panel.__shuffle(planOptions),
      correct: plan,
      ok: '¡Muy bien! Tienes claro el plan del día.',
      bad: 'Revisa las tareas/diario para conocer el plan del día.',
    });

    if (questions.length === 0) {
      questions.push({
        id: 'q-fallback',
        text: 'No hay menú cargado. ¿Qué acción es correcta ahora?',
        options: [
          'Consultar el módulo Comedor y las Notas del día',
          'Ignorar la planificación diaria',
          'Esperar sin revisar información',
          'Saltar la acogida',
        ],
        correct: 'Consultar el módulo Comedor y las Notas del día',
        ok: 'Correcto. Ese es el siguiente paso recomendado.',
        bad: 'La acogida mejora si revisamos menú y planificación diaria.',
      });
    }

    return questions;
  },

  __renderQuiz: function (contentId, ctx, questions) {
    var target = document.getElementById(contentId);
    var state = {
      idx: 0,
      answers: {},
      score: 0,
      feedback: '',
    };

    function saveResult() {
      var rid = CurrentISOTime() + '-' + safeuuid('');
      var payload = {
        Fecha: ctx.fecha,
        Persona: SUB_LOGGED_IN_ID || '',
        Aciertos: state.score,
        Total: questions.length,
        Respuestas: state.answers,
      };
      DB.put('panel_respuestas', rid, payload);
    }

    function renderCurrent() {
      var q = questions[state.idx];
      if (!q) return;

      var selected = state.answers[q.id] || '';
      var optionsHtml = q.options
        .map((option, i) => {
          var oid = safeuuid();
          var checked = selected === option ? 'checked' : '';
          return `
            <label for="${oid}" style="display:block; margin: 8px 0; padding: 8px; border: 1px solid #ccc; border-radius: 6px; cursor:pointer;">
              <input id="${oid}" type="radio" name="panel-question" value="${option.replace(/"/g, '&quot;')}" ${checked} />
              ${option}
            </label>
          `;
        })
        .join('');

      target.innerHTML = html`
        <fieldset style="max-width: 800px;">
          <legend>Pregunta ${state.idx + 1} de ${questions.length}</legend>
          <div style="margin-bottom: 10px;"><b>${q.text}</b></div>
          <small>
            Menú hoy: ${ctx.comedor.primero || '—'} / ${ctx.comedor.segundo || '—'} /
            ${ctx.comedor.postre || '—'}
          </small>
          <div style="margin-top: 10px;">${optionsHtml}</div>
          <div id="panel-feedback" style="margin-top: 12px;"><i>${state.feedback || ''}</i></div>
          <div style="margin-top: 12px; display:flex; gap:8px;">
            <button class="btn5" id="panel-next">Comprobar y continuar</button>
            <button id="panel-cancel">Salir</button>
          </div>
        </fieldset>
      `;

      document.getElementById('panel-cancel').onclick = () => setUrlHash('index');
      document.getElementById('panel-next').onclick = () => {
        var checked = document.querySelector('input[name="panel-question"]:checked');
        if (!checked) {
          state.feedback = 'Selecciona una opción antes de continuar.';
          renderCurrent();
          return;
        }

        var answer = checked.value;
        state.answers[q.id] = answer;

        var wasCorrect = answer === q.correct;
        if (wasCorrect) {
          state.score++;
          state.feedback = '✅ ' + q.ok;
        } else {
          state.feedback = '❌ ' + q.bad + ' Respuesta esperada: ' + q.correct;
        }

        if (state.idx < questions.length - 1) {
          state.idx++;
          setTimeout(() => {
            state.feedback = '';
            renderCurrent();
          }, 350);
          return;
        }

        saveResult();
        renderFinal();
      };
    }

    function renderFinal() {
      var total = questions.length;
      var ratio = total > 0 ? Math.round((state.score / total) * 100) : 0;
      var msg = 'Buen trabajo. Sigue reforzando la acogida diaria.';
      if (ratio >= 80) msg = 'Excelente acogida: gran comprensión del día.';
      else if (ratio >= 50) msg = 'Buen avance. Revisa comedor/tareas para reforzar.';

      target.innerHTML = html`
        <fieldset style="max-width: 800px;">
          <legend>Resultado del Panel</legend>
          <h2>${state.score} / ${total} aciertos (${ratio}%)</h2>
          <p>${msg}</p>
          <p><b>Plan de hoy:</b> ${ctx.planHoy}</p>
          <button class="btn5" id="panel-repeat">Repetir quiz</button>
          <button id="panel-home">Volver al inicio</button>
        </fieldset>
      `;

      document.getElementById('panel-repeat').onclick = () => {
        state.idx = 0;
        state.answers = {};
        state.score = 0;
        state.feedback = '';
        renderCurrent();
      };
      document.getElementById('panel-home').onclick = () => setUrlHash('index');
    }

    renderCurrent();
  },
};
