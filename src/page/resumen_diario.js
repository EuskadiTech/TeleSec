PERMS['resumen_diario'] = 'Resumen diario (Solo docentes!)';
PAGES.resumen_diario = {
  icon: 'static/appico/calendar.png',
  navcss: 'btn3',
  AccessControl: true,
  Title: 'Resumen Diario',
  index: function () {
    var data_Comedor = safeuuid();
    var data_Tareas = safeuuid();
    var data_Diario = safeuuid();
    var data_Weather = safeuuid();
    if (!checkRole('resumen_diario')) {
      setUrlHash('index');
      return;
    }
    container.innerHTML = html`
      <h1>Resumen Diario ${CurrentISODate()}</h1>
      <button onclick="print()">Imprimir</button>
      <br /><span
        class="btn7"
        style="display: inline-block; margin: 5px; padding: 5px; border-radius: 5px; border: 2px solid black;"
        ><b>Menú Comedor:</b> <br /><span id="${data_Comedor}">Cargando...</span></span
      >
      <br /><span
        class="btn6"
        style="display: inline-block; margin: 5px; padding: 5px; border-radius: 5px; border: 2px solid black;"
        ><b>Tareas:</b> <br />
        <pre style="overflow-wrap: break-word;white-space:pre-wrap;" id="${data_Tareas}">
Cargando...</pre
        >
      </span>
      <br /><span
        class="btn5"
        style="display: inline-block; margin: 5px; padding: 5px; border-radius: 5px; border: 2px solid black;"
        ><b>Diario:</b> <br />
        <pre style="overflow-wrap: break-word;white-space:pre-wrap;" id="${data_Diario}">
Cargando...</pre
        >
      </span>
      <br /><span
        class="btn4"
        style="display: inline-block; margin: 5px; padding: 5px; border-radius: 5px; border: 2px solid black;"
        ><b>Clima:</b> <br /><img
          loading="lazy"
          style="padding: 15px; background-color: white; height: 75px;"
          id="${data_Weather}"
      /></span>
    `;

    //#region Cargar Clima
    // Get location from DB settings.weather_location; if missing ask user and save it
    // url format: https://wttr.in/<loc>?F0m
    DB.get('settings', 'weather_location').then((loc) => {
      if (!loc) {
        loc = prompt('Introduce tu ubicación para el clima (ciudad, país):', 'Madrid, Spain');
        if (loc) {
          DB.put('settings', 'weather_location', loc);
        }
      }
      if (loc) {
        document.getElementById(data_Weather).src =
          'https://wttr.in/' + encodeURIComponent(loc) + '_IF0m_background=FFFFFF.png';
      } else {
        document.getElementById(data_Weather).src = 'https://wttr.in/_IF0m_background=FFFFFF.png';
      }
    });
    //#endregion Cargar Clima
    //#region Cargar Comedor
    DB.get('comedor', CurrentISODate()).then((data) => {
      function add_row(data) {
        // Fix newlines
        data.Platos = data.Platos || 'No hay platos registrados para hoy.';
        // Display platos
        document.getElementById(data_Comedor).innerHTML = data.Platos.replace(/\n/g, '<br>');
      }
      if (typeof data == 'string') {
        TS_decrypt(
          data,
          SECRET,
          (data, wasEncrypted) => {
            add_row(data || {});
          },
          'comedor',
          CurrentISODate()
        );
      } else {
        add_row(data || {});
      }
    });
    //#endregion Cargar Comedor
    //#region Cargar Tareas
    DB.get('notas', 'tareas').then((data) => {
      function add_row(data) {
        // Fix newlines
        data.Contenido = data.Contenido || 'No hay tareas.';
        // Display platos
        document.getElementById(data_Tareas).innerHTML = data.Contenido.replace(/\n/g, '<br>');
      }
      if (typeof data == 'string') {
        TS_decrypt(
          data,
          SECRET,
          (data, wasEncrypted) => {
            add_row(data || {});
          },
          'notas',
          'tareas'
        );
      } else {
        add_row(data || {});
      }
    });
    //#endregion Cargar Tareas
    //#region Cargar Diario
    DB.get('aulas_informes', 'diario-' + CurrentISODate()).then((data) => {
      function add_row(data) {
        // Fix newlines
        data.Contenido = data.Contenido || 'No hay un diario.';
        // Display platos
        document.getElementById(data_Diario).innerHTML = data.Contenido.replace(/\n/g, '<br>');
      }
      if (typeof data == 'string') {
        TS_decrypt(
          data,
          SECRET,
          (data, wasEncrypted) => {
            add_row(data || {});
          },
          'aulas_informes',
          'diario-' + CurrentISODate()
        );
      } else {
        add_row(data || {});
      }
    });
    //#endregion Cargar Diario
  },
};
