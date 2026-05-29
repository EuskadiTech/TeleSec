PERMS['actividades'] = 'Actividades';
PERMS['actividades:edit'] = '&gt; Editar';
PAGES.actividades = {
  navcss: 'btn5',
  icon: 'static/appico/edit.png',
  faicon: 'fas fa-star',
  AccessControl: true,
  Title: 'Actividades',
  navItems: [
    { label: 'Ver actividades', hash: 'actividades', icon: 'fas fa-star' },
    { label: 'Nueva actividad', hash: 'actividades,$nuevo$', icon: 'fas fa-plus-circle' },
  ],
  edit: function (mid) {
    var subaction = mid.split(',')[1];
    if (subaction == 'printable') {
      this.printable(mid.split(',')[0]);
      return;
    }
    if (!checkRole('actividades:edit')) {
      setUrlHash('actividades');
      return;
    }
    if (mid === '$nuevo$') {
      mid = safeuuid(''); // UID without html-safe prefix
    }
    var nameh1 = safeuuid();
    var field_asunto = safeuuid();
    var field_contenido = safeuuid();
    var field_files = safeuuid();
    var field_autorizaciones = safeuuid();
    var field_recursos = safeuuid();
    var attachments_list = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    container.innerHTML = html`
      <div class="card card-outline card-primary ts-index-card" style="width: 100%;">
        <div class="card-header">
          <h3 class="card-title" style="font-size: 25px;">
            Actividad <code style="font-size: 10px;" id="${nameh1}"></code>
          </h3>
        </div>
        <div class="card-body">
          <div id="${attachments_list}"></div>
          <label style="display: block;">
            Titulo<br />
            <input type="text" id="${field_asunto}" value="" />
          </label>
          <label style="display: block; margin-top: 12px;">
            Descripción<br />
            <textarea
              id="${field_contenido}"
              style="width: calc(100% - 15px); height: 400px;"
            ></textarea>
          </label>
          <label style="display: block; margin-top: 12px;" class="no_print">
            Añadir adjuntos (arriba)<br />
            <input type="file" id="${field_files}" multiple /><br /><br />
          </label>
          <!-- Lista de autorizaciones necesarias para esta actividad -->
          <label style="display: block; margin-top: 12px;">
            Autorizaciones necesarias (una por linea)<br />
            <textarea
              id="${field_autorizaciones}"
              style="width: calc(100% - 15px); height: 150px;"
              placeholder="Ejemplo:
Permiso de los padres
Certificado médico"
            ></textarea>
          </label>
          <label style="display: block; margin-top: 12px;">
            Recursos necesarios<br />
            <textarea
              id="${field_recursos}"
              style="width: calc(100% - 15px); height: 150px;"
              placeholder="Ejemplo:
Ropa cómoda
Botella de agua
Tarjeta de transporte"
            ></textarea>
          </label>
          <hr />
          <div class="no_print">
            <button class="saveico" id="${btn_guardar}">
              <img src="static/floppy_disk_green.png" />
              <br />Guardar
            </button>
            <button class="delico" id="${btn_borrar}">
              <img src="static/garbage.png" />
              <br />Borrar
            </button>
            <button class="opicon" onclick="setUrlHash('actividades')" style="float: right;">
              <!-- Align to the right -->
              <img src="static/exit.png" />
              <br />Salir
            </button>
            <button
              class="opicon"
              onclick="setUrlHash('actividades,${mid},printable')"
              style="float: right;"
            >
              <!-- Align to the right -->
              <img src="static/printer2.png" />
              <br />Imprimible
            </button>
          </div>
        </div>
      </div>
    `;
    DB.get('actividades', mid).then((data) => {
      function load_data(data, ENC = '') {
        document.getElementById(nameh1).innerText = mid;
        document.getElementById(field_asunto).value = data['Asunto'] || '';
        document.getElementById(field_contenido).value = data['Contenido'] || '';
        document.getElementById(field_autorizaciones).value = data['Autorizaciones']
          ? data['Autorizaciones'].join('\n')
          : '';
        document.getElementById(field_recursos).value = data['Recursos'] || '';
        // Mostrar adjuntos existentes (si los hay).
        // No confiar en `data._attachments` porque `DB.get` devuelve solo `doc.data`.
        const attachContainer = document.getElementById(attachments_list);
        attachContainer.innerHTML = '';
        // Usar API de DB para listar attachments (no acceder a internals desde la UI)
        DB.listAttachments('actividades', mid)
          .then((list) => {
            if (!list || !Array.isArray(list)) return;
            list.forEach((att) => {
              addAttachmentRow(att.name, att.dataUrl);
            });
          })
          .catch((e) => {
            console.warn('listAttachments error', e);
          });
      }
      if (typeof data == 'string') {
        TS_decrypt(data, SECRET, (data) => {
          load_data(data, '%E');
        });
      } else {
        load_data(data || {});
      }
    });
    // gestión de archivos seleccionados antes de guardar
    const attachmentsToUpload = [];
    function addAttachmentRow(name, url) {
      const attachContainer = document.getElementById(attachments_list);
      const idRow = safeuuid();
      const isImage = url && url.indexOf('data:image') === 0;
      const preview = isImage
        ? `<img src="${url}" height="200">`
        : `<a href="${url}" target="_blank">${name}</a>`;
      const html = `
          <div id="${idRow}" style="display: inline-block; text-align: center; margin: 6px 0; border: 1px solid #ddd; padding: 2.5px; border-radius: 6px;">
            ${preview}<br>
            <button type="button" class="rojo no_print" data-name="${name}">Borrar</button>
          </div>`;
      attachContainer.insertAdjacentHTML('beforeend', html);
      attachContainer.querySelectorAll(`button[data-name="${name}"]`).forEach((btn) => {
        btn.onclick = () => {
          if (!confirm('¿Borrar este adjunto?')) return;
          // Usar API pública en DB para borrar metadata del attachment
          DB.deleteAttachment('actividades', mid, name)
            .then((ok) => {
              if (ok) {
                document.getElementById(idRow).remove();
                toastr.error('Adjunto borrado');
              } else {
                toastr.error('No se pudo borrar el adjunto');
              }
            })
            .catch((e) => {
              console.warn('deleteAttachment error', e);
              toastr.error('Error borrando adjunto');
            });
        };
      });
    }

    document.getElementById(field_files).addEventListener('change', function (e) {
      const files = Array.from(e.target.files || []);
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = function (ev) {
          const dataUrl = ev.target.result;
          attachmentsToUpload.push({
            name: file.name,
            data: dataUrl,
            type: file.type || 'application/octet-stream',
          });
          // mostrar preview temporal
          addAttachmentRow(file.name, dataUrl);
        };
        reader.readAsDataURL(file);
      });
      // limpiar input para permitir re-subidas del mismo archivo
      e.target.value = '';
    });
    document.getElementById(btn_guardar).onclick = () => {
      // Disable button to prevent double-clicking
      var guardarBtn = document.getElementById(btn_guardar);
      if (guardarBtn.disabled) return;

      guardarBtn.disabled = true;
      guardarBtn.style.opacity = '0.5';

      var data = {
        Contenido: document.getElementById(field_contenido).value,
        Asunto: document.getElementById(field_asunto).value,
        Recursos: document.getElementById(field_recursos).value,
        Autorizaciones: document
          .getElementById(field_autorizaciones)
          .value.split('\n')
          .map((s) => s.trim())
          .filter((s) => s),
      };
      document.getElementById('actionStatus').style.display = 'block';
      DB.put('actividades', mid, data)
        .then(() => {
          // subir attachments si los hay
          const uploadPromises = [];
          attachmentsToUpload.forEach((att) => {
            if (DB.putAttachment) {
              uploadPromises.push(
                DB.putAttachment('actividades', mid, att.name, att.data, att.type).catch((e) => {
                  console.warn('putAttachment error', e);
                })
              );
            }
          });
          Promise.all(uploadPromises)
            .then(() => {
              // limpiar lista temporal y recargar attachments
              attachmentsToUpload.length = 0;
              try {
                // recargar lista actual sin salir
                const pouchId = 'actividades:' + mid;
                if (DB && DB._internal && DB._internal.local) {
                  DB._internal.local
                    .get(pouchId, { attachments: true })
                    .then((doc) => {
                      const attachContainer = document.getElementById(attachments_list);
                      attachContainer.innerHTML = '';
                      if (doc && doc._attachments) {
                        Object.keys(doc._attachments).forEach((name) => {
                          try {
                            const att = doc._attachments[name];
                            if (att && att.data) {
                              const durl =
                                'data:' +
                                (att.content_type || 'application/octet-stream') +
                                ';base64,' +
                                att.data;
                              addAttachmentRow(name, durl);
                              return;
                            }
                          } catch (e) {}
                          DB.getAttachment('actividades', mid, name)
                            .then((durl) => {
                              addAttachmentRow(name, durl);
                            })
                            .catch(() => {});
                        });
                      }
                    })
                    .catch(() => {
                      /* ignore reload errors */
                    });
                }
              } catch (e) {}
              toastr.success('Guardado!');
              setTimeout(() => {
                document.getElementById('actionStatus').style.display = 'none';
                setUrlHash('actividades');
              }, SAVE_WAIT);
            })
            .catch((e) => {
              console.warn('Attachment upload error', e);
              document.getElementById('actionStatus').style.display = 'none';
              guardarBtn.disabled = false;
              guardarBtn.style.opacity = '1';
              toastr.error('Error al guardar los adjuntos');
            });
        })
        .catch((e) => {
          console.warn('DB.put error', e);
          document.getElementById('actionStatus').style.display = 'none';
          guardarBtn.disabled = false;
          guardarBtn.style.opacity = '1';
          toastr.error('Error al guardar la actividad');
        });
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (confirm('¿Quieres borrar esta actividad?') == true) {
        DB.del('actividades', mid).then(() => {
          toastr.error('Borrado!');
          setTimeout(() => {
            setUrlHash('actividades');
          }, SAVE_WAIT);
        });
      }
    };
  },
  printable: function (mid) {
    if (!checkRole('actividades')) {
      setUrlHash('actividades');
      return;
    }
    var titleh1 = safeuuid();
    var nameh1 = safeuuid();
    var field_asunto = safeuuid();
    var field_contenido = safeuuid();
    var field_files = safeuuid();
    var field_autorizaciones = safeuuid();
    var field_recursos = safeuuid();
    var div_autorizaciones = safeuuid();
    var div_recursos = safeuuid();
    var div_datosnecesarios = safeuuid();
    var attachments_list = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    container.innerHTML = html`
      <div class="card card-outline card-primary ts-index-card" style="width: 100%;">
        <div class="card-header">
          <h3 class="card-title" style="font-size: 25px;">
            <b>Actividad:</b> <span id="${titleh1}"></span>
          </h3>
        </div>
        <div class="card-body">
          <div id="${attachments_list}"></div>
          <!-- Div estilo Textarea de solo lectura para impresión -->
          <div
            id="${field_contenido}"
            style="white-space: pre-wrap; width: 100%; min-height: 400px; border: 1px solid #ccc; padding: 10px; border-radius: 4px;"
          ></div>
          <hr />
          <div class="no_print">
            <button class="opicon" onclick="setUrlHash('actividades,${mid}')" style="float: right;">
              <!-- Align to the right -->
              <img src="static/exit.png" />
              <br />Salir
            </button>
            <button class="opicon" onclick="window.print()" style="float: right;">
              <!-- Align to the right -->
              <img src="static/printer2.png" />
              <br />Imprimir
            </button>
          </div>
        </div>
      </div>
      <div class="salto-pagina"></div>
      <div id="${div_datosnecesarios}" class="card card-outline card-primary ts-index-card" style="width: 100%; display: none;">
        <div class="card-header">
          <h3 class="card-title" style="font-size: 25px;">Datos necesarios para la actividad</h3>
        </div>
        <div class="card-body">
          <p>Para poder realizar esta actividad, debe de tener en cuenta lo siguiente:</p>
          <div id="${div_autorizaciones}" style="margin-top: 10px; display: none;">
            <h4>Autorizaciones necesarias</h4>
            <i>Marcar <b>X</b> en la casilla de "Si" o "No".</i><br />
            <!-- Una caja estilo checkbox de solo lectura con el nombre de la autorizacion a la derecha. grid de 2 columnas -->
            <div
              id="${field_autorizaciones}"
              style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;"
            ></div>
          </div>
          <div id="${div_recursos}" style="margin-top: 10px; display: none;">
            <h4>Recursos necesarios</h4>
            <div
              id="${field_recursos}"
              style="white-space: pre-wrap; width: 100%; min-height: 150px; border: 1px solid #ccc; padding: 10px; border-radius: 4px;"
            ></div>
          </div>
        </div>
      </div>
    `;
    DB.get('actividades', mid).then((data) => {
      function load_data(data, ENC = '') {
        document.getElementById(titleh1).innerText = data['Asunto'] || 'Sin titulo';
        document.getElementById(field_contenido).innerText = data['Contenido'] || '';
        document.getElementById(field_recursos).innerText = data['Recursos'] || '';
        document.getElementById(field_autorizaciones).innerHTML = '';
        if (data['Autorizaciones'] && Array.isArray(data['Autorizaciones'])) {
          data['Autorizaciones'].forEach((auth) => {
            const authHtml = `
              <div style="display: flex; align-items: flex-start; padding: 15px; border: 1px solid #555; border-radius: 4px; height: 100px;">
                <div style="border: 3px solid green;border-radius: 5px;text-align: center;padding: 3px; height: 52.5px; width: 52.5px; margin-right: 5px; vertical-align: top;"><br><br>Si</div>
                <div style="border: 3px solid red;border-radius: 5px;text-align: center;padding: 3px; height: 52.5px; width: 52.5px; margin-right: 5px; vertical-align: top;"><br><br>No</div>
                <b style="margin-left: 5px;">${auth}</b>
              </div>
            `;
            document.getElementById(field_autorizaciones).insertAdjacentHTML('beforeend', authHtml);
          });
          if (data['Autorizaciones'].length > 0) {
            document.getElementById(div_autorizaciones).style.display = 'block';
            document.getElementById(div_datosnecesarios).style.display = 'block';
          }
        }
        if ((data['Recursos'] || "").trim() !== '' && data['Recursos'] !== undefined) {
          document.getElementById(div_recursos).style.display = 'block';
          document.getElementById(div_datosnecesarios).style.display = 'block';
        }
        // Mostrar adjuntos existentes (si los hay).
        // No confiar en `data._attachments` porque `DB.get` devuelve solo `doc.data`.
        const attachContainer = document.getElementById(attachments_list);
        attachContainer.innerHTML = '';
        // Usar API de DB para listar attachments (no acceder a internals desde la UI)
        DB.listAttachments('actividades', mid)
          .then((list) => {
            if (!list || !Array.isArray(list)) return;
            list.forEach((att) => {
              addAttachmentRow(att.name, att.dataUrl);
            });
          })
          .catch((e) => {
            console.warn('listAttachments error', e);
          });
      }
      if (typeof data == 'string') {
        TS_decrypt(data, SECRET, (data) => {
          load_data(data, '%E');
        });
      } else {
        load_data(data || {});
      }
    });
    // gestión de archivos seleccionados antes de guardar
    const attachmentsToUpload = [];
    function addAttachmentRow(name, url) {
      const attachContainer = document.getElementById(attachments_list);
      const idRow = safeuuid();
      const isImage = url && url.indexOf('data:image') === 0;
      const preview = isImage
        ? `<img src="${url}" height="200">`
        : `<a href="${url}" target="_blank">${name}</a>`;
      const html = `
          <div id="${idRow}" style="display: inline-block; text-align: center; margin: 6px 0; border: 1px solid #ddd; padding: 2.5px; border-radius: 6px;">
            ${preview}<br>
          </div>`;
      attachContainer.insertAdjacentHTML('beforeend', html);
    }
  },
  index: function () {
    if (!checkRole('actividades')) {
      setUrlHash('index');
      return;
    }
    const tablebody = safeuuid();
    container.innerHTML = html`<h1><i class="fas fa-star"></i> Actividades</h1>
      <div id="${tablebody}"></div> `;
    TS_IndexElement(
      'actividades',
      [
        {
          key: 'Asunto',
          type: 'raw',
          default: '',
          label: 'Asunto',
        },
      ],
      'actividades',
      document.getElementById(tablebody),
      undefined,
      undefined,
      true, // Enable global search bar
      'Actividades', // Title for the index page
      'actividades,$nuevo$' // Hash for the "Add New" button
    );
  },
};
