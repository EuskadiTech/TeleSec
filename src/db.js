// Simple PouchDB wrapper for TeleSec
// - Uses PouchDB for local storage and optional replication to a CouchDB server
// - Stores records as docs with _id = "<table>:<id>" and field `data` containing either plain object or encrypted string
// - Exposes: init, put, get, del, map, list, replicate

var DB = (function () {
  let local = null;
  let remote = null;
  let changes = null;
  let repPush = null;
  let repPull = null;
  let repBootstrap = null;
  let remoteKey = '';
  let onlineReplTimer = null;
  let callbacks = {}; // table -> [{ id, cb }]
  let callbackSeq = 0;
  let docCache = {}; // _id -> last data snapshot (stringified)
  let tableListCache = {}; // table -> { ts, rows }
  let tableListInFlight = {}; // table -> Promise<rows>
  let lastOrbAt = 0;
  let orbTimer = null;

  const LIST_CACHE_TTL_MS = 1500;
  const ORB_MIN_INTERVAL_MS = 400;
  const INITIAL_REPL_BATCH_SIZE = 500;

  function bootstrapFlagKey(key) {
    return 'TELESEC_REPL_BOOTSTRAP_DONE:' + key;
  }

  function hasBootstrapDone(key) {
    if (!key) return true;
    try {
      return localStorage.getItem(bootstrapFlagKey(key)) === '1';
    } catch (e) {
      return false;
    }
  }

  function markBootstrapDone(key) {
    if (!key) return;
    try {
      localStorage.setItem(bootstrapFlagKey(key), '1');
    } catch (e) {}
  }

  function ensureLocal() {
    if (local) return;
    try {
      const localName = 'telesec';
      local = new PouchDB(localName);
      if (changes) {
        try {
          changes.cancel();
        } catch (e) {}
      }
      changes = local
        .changes({ live: true, since: 'now', include_docs: true })
        .on('change', onChange);
    } catch (e) {
      console.warn('ensureLocal error', e);
    }
  }

  function makeId(table, id) {
    return table + ':' + id;
  }

  function makeCallbackId(table) {
    callbackSeq += 1;
    return table + '#' + callbackSeq;
  }

  function makeRemoteKey(opts, localName) {
    if (!opts || !opts.remoteServer) return '';
    const server = String(opts.remoteServer || '').replace(/\/$/, '');
    const dbname = encodeURIComponent(opts.dbname || localName);
    const username = opts.username || '';
    return server + '|' + dbname + '|' + username;
  }

  function invalidateTableCache(table) {
    if (table && tableListCache[table]) delete tableListCache[table];
  }

  function toStableSnapshot(data) {
    if (typeof data === 'string') return data;
    try {
      return JSON.stringify(data);
    } catch (e) {
      return String(data);
    }
  }

  function updateSyncStatus(doc) {
    try {
      window.TELESEC_LAST_SYNC = Date.now();

      // Keep hash work bounded on low-end devices: sample payload and include length.
      let payload = '';
      try {
        payload = typeof doc.data === 'string' ? doc.data : JSON.stringify(doc.data || {});
      } catch (e) {
        payload = String(doc._id || '');
      }
      const sample = payload.length > 512 ? payload.slice(0, 512) + ':' + payload.length : payload;
      let hash = 0;
      for (let i = 0; i < sample.length; i++) {
        hash = (hash * 31 + sample.charCodeAt(i)) >>> 0;
      }
      const hue = hash % 360;
      window.TELESEC_LAST_SYNC_COLOR = `hsl(${hue}, 70%, 50%)`;

      if (typeof updateStatusOrb !== 'function') return;
      const now = Date.now();
      const elapsed = now - lastOrbAt;
      if (elapsed >= ORB_MIN_INTERVAL_MS) {
        lastOrbAt = now;
        updateStatusOrb();
        return;
      }
      if (orbTimer) return;
      orbTimer = setTimeout(function () {
        orbTimer = null;
        lastOrbAt = Date.now();
        try {
          updateStatusOrb();
        } catch (e) {}
      }, ORB_MIN_INTERVAL_MS - elapsed);
    } catch (e) {}
  }

  function init(opts) {
    const localName = 'telesec';
    try {
      if (opts && opts.secret) {
        SECRET = opts.secret;
        try {
          localStorage.setItem('TELESEC_SECRET', SECRET);
        } catch (e) {}
      }
    } catch (e) {}
    local = new PouchDB(localName);

    const nextRemoteKey = makeRemoteKey(opts, localName);
    if (opts.remoteServer) {
      try {
        if (nextRemoteKey !== remoteKey || !remote) {
          const server = opts.remoteServer.replace(/\/$/, '');
          const dbname = encodeURIComponent(opts.dbname || localName);
          let authPart = '';
          if (opts.username) authPart = opts.username + ':' + (opts.password || '') + '@';
          const remoteUrl = server.replace(/https?:\/\//, (m) => m) + '/' + dbname;
          if (opts.username) remote = new PouchDB(remoteUrl.replace(/:\/\//, '://' + authPart));
          else remote = new PouchDB(remoteUrl);
          remoteKey = nextRemoteKey;
          replicateToRemote();
        }
      } catch (e) {
        console.warn('Remote DB init error', e);
      }
    }

    if (changes) changes.cancel();
    changes = local
      .changes({ live: true, since: 'now', include_docs: true })
      .on('change', onChange);
    return Promise.resolve();
  }

  function replicateToRemote() {
    ensureLocal();
    if (!local || !remote) return;
    try {
      if (repPush && repPush.cancel) repPush.cancel();
    } catch (e) {}
    try {
      if (repPull && repPull.cancel) repPull.cancel();
    } catch (e) {}
    try {
      if (repBootstrap && repBootstrap.cancel) repBootstrap.cancel();
    } catch (e) {}

    const liveOpts = {
      live: true,
      retry: true,
      heartbeat: 10000,
      timeout: 60000,
      batch_size: 100,
      batches_limit: 10,
    };

    function startLiveReplication() {
      repPush = PouchDB.replicate(local, remote, liveOpts).on('error', function (err) {
        console.warn('Replication push error', err);
      });
      repPull = PouchDB.replicate(remote, local, liveOpts).on('error', function (err) {
        console.warn('Replication pull error', err);
      });
    }

    // First replication to a remote tends to create many small requests.
    // Run one-shot sync in larger batches first, then switch to live mode.
    if (!hasBootstrapDone(remoteKey)) {
      repBootstrap = PouchDB.sync(local, remote, {
        live: false,
        retry: false,
        batch_size: INITIAL_REPL_BATCH_SIZE,
        batches_limit: 20,
      })
        .on('complete', function () {
          repBootstrap = null;
          markBootstrapDone(remoteKey);
          startLiveReplication();
        })
        .on('error', function (err) {
          repBootstrap = null;
          console.warn('Initial replication bootstrap error', err);
          startLiveReplication();
        });
      return;
    }

    startLiveReplication();
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', function () {
      try {
        if (onlineReplTimer) clearTimeout(onlineReplTimer);
        onlineReplTimer = setTimeout(function () {
          onlineReplTimer = null;
          replicateToRemote();
        }, 1200);
      } catch (e) {}
    });
  }

  function onChange(change) {
    const doc = change.doc;
    if (!doc || !doc._id) return;
    const sep = doc._id.indexOf(':');
    const table = sep === -1 ? doc._id : doc._id.slice(0, sep);
    const id = sep === -1 ? '' : doc._id.slice(sep + 1);
    invalidateTableCache(table);

    // handle deletes
    if (change.deleted || doc._deleted) {
      updateSyncStatus(doc);
      delete docCache[doc._id];
      if (callbacks[table]) {
        callbacks[table].forEach((listener) => {
          const cb = listener.cb;
          try {
            cb(null, id);
          } catch (e) {
            console.error(e);
          }
        });
      }
      return;
    }

    // handle insert/update
    let changed = true;
    try {
      const now = toStableSnapshot(doc.data);
      const prev = docCache[doc._id];
      if (prev === now) changed = false;
      docCache[doc._id] = now;
    } catch (e) {
      /* ignore cache errors */
    }

    if (!changed) return; // no meaningful change

    updateSyncStatus(doc);

    if (callbacks[table]) {
      callbacks[table].forEach((listener) => {
        const cb = listener.cb;
        try {
          cb(doc.data, id);
        } catch (e) {
          console.error(e);
        }
      });
    }
  }

  async function put(table, id, data) {
    ensureLocal();
    invalidateTableCache(table);
    const _id = makeId(table, id);
    try {
      const existing = await local.get(_id).catch(() => null);
      if (data === null) {
        if (existing) await local.remove(existing);
        return;
      }
      const doc = existing || { _id: _id };
      var toStore = data;
      try {
        var isEncryptedString =
          typeof data === 'string' && data.startsWith('RSA{') && data.endsWith('}');
        if (
          !isEncryptedString &&
          typeof TS_encrypt === 'function' &&
          typeof SECRET !== 'undefined' &&
          SECRET
        ) {
          toStore = await new Promise((resolve) => {
            try {
              TS_encrypt(data, SECRET, (enc) => resolve(enc));
            } catch (e) {
              resolve(data);
            }
          });
        }
      } catch (e) {
        toStore = data;
      }
      doc.data = toStore;
      doc.table = table;
      doc.ts = new Date().toISOString();
      if (existing) doc._rev = existing._rev;
      await local.put(doc);
    } catch (e) {
      console.error('DB.put error', e);
    }
  }

  async function get(table, id) {
    ensureLocal();
    const _id = makeId(table, id);
    try {
      const doc = await local.get(_id);
      return doc.data;
    } catch (e) {
      return null;
    }
  }

  async function del(table, id) {
    return put(table, id, null);
  }

  async function list(table) {
    ensureLocal();
    const now = Date.now();
    const cached = tableListCache[table];
    if (cached && now - cached.ts <= LIST_CACHE_TTL_MS) {
      return cached.rows;
    }
    if (tableListInFlight[table]) {
      return tableListInFlight[table];
    }
    try {
      tableListInFlight[table] = local
        .allDocs({
          include_docs: true,
          startkey: table + ':',
          endkey: table + ':\uffff',
        })
        .then((res) => {
          const rows = res.rows.map((r) => {
            const sep = r.id.indexOf(':');
            const id = sep === -1 ? r.id : r.id.slice(sep + 1);
            try {
              docCache[r.id] = toStableSnapshot(r.doc.data);
            } catch (e) {}
            return { id: id, data: r.doc.data };
          });
          tableListCache[table] = { ts: Date.now(), rows: rows };
          return rows;
        })
        .finally(() => {
          delete tableListInFlight[table];
        });
      return await tableListInFlight[table];
    } catch (e) {
      delete tableListInFlight[table];
      return [];
    }
  }

  function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  }

  async function putAttachment(table, id, name, dataUrlOrBlob, contentType) {
    ensureLocal();
    const _id = makeId(table, id);
    try {
      let doc = await local.get(_id).catch(() => null);
      if (!doc) {
        await local.put({ _id: _id, table: table, ts: new Date().toISOString(), data: {} });
        doc = await local.get(_id);
      }
      let blob = dataUrlOrBlob;
      if (typeof dataUrlOrBlob === 'string' && dataUrlOrBlob.indexOf('data:') === 0)
        blob = dataURLtoBlob(dataUrlOrBlob);
      const type = contentType || (blob && blob.type) || 'application/octet-stream';
      await local.putAttachment(_id, name, doc._rev, blob, type);
      return true;
    } catch (e) {
      console.error('putAttachment error', e);
      return false;
    }
  }

  async function getAttachment(table, id, name) {
    ensureLocal();
    const _id = makeId(table, id);
    try {
      const blob = await local.getAttachment(_id, name);
      if (!blob) return null;
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  }

  async function listAttachments(table, id) {
    ensureLocal();
    const _id = makeId(table, id);
    try {
      const doc = await local.get(_id, { attachments: true });
      if (!doc || !doc._attachments) return [];
      const out = [];
      for (const name of Object.keys(doc._attachments)) {
        try {
          const att = doc._attachments[name];
          if (att && att.data) {
            const content_type = att.content_type || 'application/octet-stream';
            const durl = 'data:' + content_type + ';base64,' + att.data;
            out.push({ name: name, dataUrl: durl, content_type: content_type });
            continue;
          }
        } catch (e) {}
        try {
          const durl = await getAttachment(table, id, name);
          out.push({ name: name, dataUrl: durl, content_type: null });
        } catch (e) {
          out.push({ name: name, dataUrl: null, content_type: null });
        }
      }
      return out;
    } catch (e) {
      try {
        const doc = await local.get(_id).catch(() => null);
        if (!doc || !doc._attachments) return [];
        const out = [];
        for (const name of Object.keys(doc._attachments)) {
          try {
            const durl = await getAttachment(table, id, name);
            out.push({ name: name, dataUrl: durl, content_type: null });
          } catch (e) {
            out.push({ name: name, dataUrl: null, content_type: null });
          }
        }
        return out;
      } catch (e2) {
        return [];
      }
    }
  }

  async function deleteAttachment(table, id, name) {
    ensureLocal();
    const _id = makeId(table, id);
    try {
      const doc = await local.get(_id);
      if (!doc || !doc._attachments || !doc._attachments[name]) return false;
      delete doc._attachments[name];
      await local.put(doc);
      return true;
    } catch (e) {
      console.error('deleteAttachment error', e);
      return false;
    }
  }

  function map(table, cb) {
    ensureLocal();
    const callbackId = makeCallbackId(table);
    callbacks[table] = callbacks[table] || [];
    callbacks[table].push({ id: callbackId, cb: cb });
    list(table).then((rows) => {
      const stillListening = (callbacks[table] || []).some((listener) => listener.id === callbackId);
      if (!stillListening) return;
      rows.forEach((r) => cb(r.data, r.id));
    });
    return callbackId;
  }

  function unlisten(callbackId) {
    if (!callbackId) return false;
    for (const table of Object.keys(callbacks)) {
      const before = callbacks[table].length;
      callbacks[table] = callbacks[table].filter((listener) => listener.id !== callbackId);
      if (callbacks[table].length !== before) return true;
    }
    return false;
  }

  return {
    init,
    put,
    get,
    del,
    list,
    map,
    unlisten,
    replicateToRemote,
    listAttachments,
    deleteAttachment,
    putAttachment,
    getAttachment,
    _internal: {
      get local() {
        return local;
      },
    },
  };
})();

window.DB = DB;

// Auto-initialize DB on startup using saved settings (non-blocking)
(function autoInitDB() {
  try {
    const remoteServer = localStorage.getItem('TELESEC_COUCH_URL') || '';
    const username = localStorage.getItem('TELESEC_COUCH_USER') || '';
    const password = localStorage.getItem('TELESEC_COUCH_PASS') || '';
    const dbname = localStorage.getItem('TELESEC_COUCH_DBNAME') || undefined;
    try {
      SECRET = localStorage.getItem('TELESEC_SECRET') || '';
    } catch (e) {
      SECRET = '';
    }
    DB.init({ remoteServer, username, password, dbname }).catch((e) =>
      console.warn('DB.autoInit error', e)
    );
  } catch (e) {
    console.warn('DB.autoInit unexpected error', e);
  }
})();
