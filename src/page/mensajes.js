PERMS['mensajes'] = 'Mensajes';
PERMS['mensajes:edit'] = '&gt; Editar';
PAGES.mensajes = {
  navcss: 'btn5',
  icon: 'static/appico/message.png',
  AccessControl: true,
  // AccessControlRole is not needed.
  Title: 'Mensajes',
  edit: function (mid) {
    if (!checkRole('mensajes:edit')) {
      setUrlHash('mensajes');
      return;
    }
    var nameh1 = safeuuid();
    var field_asunto = safeuuid();
    var field_contenido = safeuuid();
    var field_autor = safeuuid();
    var field_files = safeuuid();
    var attachments_list = safeuuid();
    var btn_guardar = safeuuid();
    var btn_borrar = safeuuid();
    var div_actions = safeuuid();
    container.innerHTML = html`
      <h1>Mensaje <code id="${nameh1}"></code></h1>
      <fieldset style="float: none; width: calc(100% - 40px);max-width: none;">
        <legend>Valores</legend>
        <div style="max-width: 400px;">
          <label>
            Asunto<br />
            <input type="text" id="${field_asunto}" value="" /><br /><br />
          </label>
          <label>
            Origen<br />
            <input type="text" id="${field_autor}" value="" /><br /><br />
          </label>
        </div>
        <label>
          Contenido<br />
          <textarea
            id="${field_contenido}"
            style="width: calc(100% - 15px); height: 400px;"
          ></textarea
          ><br /><br />
        </label>
        <label>
          Adjuntos (Fotos o archivos)<br />
          <input type="file" id="${field_files}" multiple /><br /><br />
          <div id="${attachments_list}"></div>
        </label>
        <hr />
        <button class="btn5" id="${btn_guardar}">Guardar</button>
        <button class="rojo" id="${btn_borrar}">Borrar</button>
      </fieldset>
    `;
    DB.get('mensajes', mid).then((data) => {
      function load_data(data, ENC = '') {
        document.getElementById(nameh1).innerText = mid;
        document.getElementById(field_asunto).value = data['Asunto'] || '';
        document.getElementById(field_contenido).value = data['Contenido'] || '';
        document.getElementById(field_autor).value = data['Autor'] || SUB_LOGGED_IN_DETAILS["Nombre"] || '';

        // Mostrar adjuntos existentes (si los hay).
        // No confiar en `data._attachments` porque `DB.get` devuelve solo `doc.data`.
        const attachContainer = document.getElementById(attachments_list);
        attachContainer.innerHTML = '';
        // Usar API de DB para listar attachments (no acceder a internals desde la UI)
        DB.listAttachments('mensajes', mid)
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
        ? `<img src="${url}" height="80" style="margin-right:8px;">`
        : `<a href="${url}" target="_blank">${name}</a>`;
      const html = `
          <div id="${idRow}" style="display:flex;align-items:center;margin:6px 0;border:1px solid #ddd;padding:6px;border-radius:6px;">
            <div style="flex:1">${preview}<strong style="margin-left:8px">${name}</strong></div>
            <div><button type="button" class="rojo" data-name="${name}">Borrar</button></div>
          </div>`;
      attachContainer.insertAdjacentHTML('beforeend', html);
      attachContainer.querySelectorAll(`button[data-name="${name}"]`).forEach((btn) => {
        btn.onclick = () => {
          if (!confirm('¿Borrar este adjunto?')) return;
          // Usar API pública en DB para borrar metadata del attachment
          DB.deleteAttachment('mensajes', mid, name)
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
        Autor: document.getElementById(field_autor).value,
        Contenido: document.getElementById(field_contenido).value,
        Asunto: document.getElementById(field_asunto).value,
      };
      document.getElementById('actionStatus').style.display = 'block';
      DB.put('mensajes', mid, data)
        .then(() => {
          // subir attachments si los hay
          const uploadPromises = [];
          attachmentsToUpload.forEach((att) => {
            if (DB.putAttachment) {
              uploadPromises.push(
                DB.putAttachment('mensajes', mid, att.name, att.data, att.type).catch((e) => {
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
                const pouchId = 'mensajes:' + mid;
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
                          DB.getAttachment('mensajes', mid, name)
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
                setUrlHash('mensajes');
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
          toastr.error('Error al guardar el mensaje');
        });
    };
    document.getElementById(btn_borrar).onclick = () => {
      if (confirm('¿Quieres borrar este mensaje?') == true) {
        DB.del('mensajes', mid).then(() => {
          toastr.error('Borrado!');
          setTimeout(() => {
            setUrlHash('mensajes');
          }, SAVE_WAIT);
        });
      }
    };
  },
  index: function () {
    if (!checkRole('mensajes')) {
      setUrlHash('index');
      return;
    }
    const tablebody = safeuuid();
    var btn_new = safeuuid();
    container.innerHTML = html`
      <h1>Mensajes</h1>
      <button id="${btn_new}">Nuevo mensaje</button>
      <div id="cont"></div>
    `;
    TS_IndexElement(
      'mensajes',
      [
        {
          key: 'Autor',
          type: 'raw',
          default: '',
          label: 'Origen',
        },
        {
          key: 'Asunto',
          type: 'raw',
          default: '',
          label: 'Asunto',
        },
      ],
      'mensajes',
      document.querySelector('#cont')
    );
    if (!checkRole('mensajes:edit')) {
      document.getElementById(btn_new).style.display = 'none';
    } else {
      document.getElementById(btn_new).onclick = () => {
        setUrlHash('mensajes,' + safeuuid(''));
      };
    }
  },
};
