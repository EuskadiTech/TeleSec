// db.js – RxDB-based local-first database wrapper for TeleSec
//
// Replaces PouchDB with RxDB + IndexedDB (Dexie) storage.
// Replication to the Flask backend uses RxDB's custom pull/push protocol.
// No at-rest encryption: data is stored in plaintext in IndexedDB.

var DB = (function () {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  let rxdb = null;
  let collection = null;
  let replicationState = null;
  let initPromise = null;

  let callbacks = {}; // table -> [{ id, cb }]
  let callbackSeq = 0;
  let tableListCache = {}; // table -> { ts, rows }
  let tableListInFlight = {}; // table -> Promise<rows>
  let lastOrbAt = 0;
  let orbTimer = null;
  let onlineReplTimer = null;

  const LIST_CACHE_TTL_MS = 1500;
  const ORB_MIN_INTERVAL_MS = 400;

  // -------------------------------------------------------------------------
  // RxDB schema – single "documents" collection
  // -------------------------------------------------------------------------
  const DOCUMENTS_SCHEMA = {
    version: 0,
    type: 'object',
    primaryKey: 'id',
    properties: {
      id: { type: 'string', maxLength: 500 },
      table_name: { type: 'string', maxLength: 100 },
      data: { type: 'object' },
      updated_at: { type: 'string', maxLength: 50 },
    },
    required: ['id', 'table_name', 'data'],
    indexes: ['table_name', 'updated_at'],
  };

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function getApiUrl() {
    return (localStorage.getItem('TELESEC_API_URL') || '').replace(/\/$/, '');
  }

  function getAuthToken() {
    return localStorage.getItem('TELESEC_JWT') || '';
  }

  function makeCallbackId(table) {
    callbackSeq += 1;
    return table + '#' + callbackSeq;
  }

  function invalidateTableCache(table) {
    if (table && tableListCache[table]) delete tableListCache[table];
  }

  function updateSyncStatus() {
    try {
      window.TELESEC_LAST_SYNC = Date.now();
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
        try { updateStatusOrb(); } catch (e) {}
      }, ORB_MIN_INTERVAL_MS - elapsed);
    } catch (e) {}
  }

  // -------------------------------------------------------------------------
  // RxDB initialisation (lazy, called once)
  // -------------------------------------------------------------------------
  async function _initRxDB() {
    if (rxdb) return;

    rxdb = await RxDB.createRxDatabase({
      name: 'telesec',
      storage: RxDB.getRxStorageDexie(),
      ignoreDuplicate: true,
    });

    const cols = await rxdb.addCollections({
      documents: { schema: DOCUMENTS_SCHEMA },
    });
    collection = cols.documents;

    // Subscribe to all document changes so map() callbacks fire reactively
    collection.$.subscribe(function (changeEvent) {
      try {
        const doc = changeEvent.documentData;
        if (!doc || !doc.id) return;

        const sep = doc.id.indexOf(':');
        const table = sep === -1 ? doc.id : doc.id.slice(0, sep);
        const id = sep === -1 ? '' : doc.id.slice(sep + 1);

        invalidateTableCache(table);
        updateSyncStatus();

        if (changeEvent.operation === 'DELETE') {
          (callbacks[table] || []).forEach(function (l) {
            try { l.cb(null, id); } catch (e) { console.error(e); }
          });
          return;
        }

        (callbacks[table] || []).forEach(function (l) {
          try { l.cb(doc.data || {}, id); } catch (e) { console.error(e); }
        });
      } catch (e) {
        console.warn('DB change handler error', e);
      }
    });
  }

  function ensureInit() {
    if (!initPromise) {
      initPromise = _initRxDB();
    }
    return initPromise;
  }

  // -------------------------------------------------------------------------
  // Replication
  // -------------------------------------------------------------------------
  function startReplication() {
    const apiUrl = getApiUrl();
    const token = getAuthToken();
    if (!apiUrl || !token || !collection) return;

    if (replicationState) {
      try { replicationState.cancel(); } catch (e) {}
      replicationState = null;
    }

    replicationState = RxDB.replicateRxCollection({
      collection: collection,
      replicationIdentifier: 'telesec-flask-v1',
      live: true,
      retryTime: 5000,
      pull: {
        batchSize: 50,
        handler: async function (lastCheckpoint, batchSize) {
          const params = new URLSearchParams({ limit: String(batchSize) });
          if (lastCheckpoint && lastCheckpoint.updatedAt) {
            params.set('updatedAt', lastCheckpoint.updatedAt);
            params.set('id', lastCheckpoint.id || '');
          }
          const res = await fetch(getApiUrl() + '/api/replicate/pull?' + params.toString(), {
            headers: {
              Authorization: 'Bearer ' + getAuthToken(),
              Accept: 'application/json',
            },
          });
          if (!res.ok) throw new Error('Pull failed: ' + res.status);
          const json = await res.json();
          return { documents: json.documents, checkpoint: json.checkpoint };
        },
      },
      push: {
        batchSize: 50,
        handler: async function (rows) {
          const body = rows.map(function (row) { return row.newDocumentState; });
          const res = await fetch(getApiUrl() + '/api/replicate/push', {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + getAuthToken(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error('Push failed: ' + res.status);
          return await res.json(); // [] = no conflicts
        },
      },
    });

    replicationState.error$.subscribe(function (err) {
      console.warn('Replication error', err);
    });

    replicationState.active$.subscribe(function (active) {
      if (active) updateSyncStatus();
    });
  }

  function stopReplication() {
    if (replicationState) {
      try { replicationState.cancel(); } catch (e) {}
      replicationState = null;
    }
  }

  // Re-start replication when coming back online
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', function () {
      try {
        if (onlineReplTimer) clearTimeout(onlineReplTimer);
        onlineReplTimer = setTimeout(function () {
          onlineReplTimer = null;
          startReplication();
        }, 1200);
      } catch (e) {}
    });
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------
  async function init(opts) {
    await ensureInit();
    startReplication();
    return Promise.resolve();
  }

  async function put(table, id, data) {
    await ensureInit();
    invalidateTableCache(table);
    const docId = table + ':' + id;
    const now = new Date().toISOString();
    try {
      if (data === null) {
        const existing = await collection.findOne(docId).exec();
        if (existing) await existing.remove();
        return;
      }
      const existing = await collection.findOne(docId).exec();
      if (existing) {
        await existing.patch({ data: data, updated_at: now });
      } else {
        await collection.insert({ id: docId, table_name: table, data: data, updated_at: now });
      }
    } catch (e) {
      console.error('DB.put error', e);
    }
  }

  async function get(table, id) {
    await ensureInit();
    const docId = table + ':' + id;
    try {
      const doc = await collection.findOne(docId).exec();
      return doc ? doc.data : null;
    } catch (e) {
      return null;
    }
  }

  async function del(table, id) {
    return put(table, id, null);
  }

  async function list(table) {
    await ensureInit();
    const now = Date.now();
    const cached = tableListCache[table];
    if (cached && now - cached.ts <= LIST_CACHE_TTL_MS) return cached.rows;
    if (tableListInFlight[table]) return tableListInFlight[table];

    try {
      tableListInFlight[table] = collection
        .find({ selector: { table_name: { $eq: table } } })
        .exec()
        .then(function (docs) {
          const rows = docs.map(function (doc) {
            const sep = doc.id.indexOf(':');
            const id = sep === -1 ? doc.id : doc.id.slice(sep + 1);
            return { id: id, data: doc.data };
          });
          tableListCache[table] = { ts: Date.now(), rows: rows };
          return rows;
        })
        .finally(function () {
          delete tableListInFlight[table];
        });
      return await tableListInFlight[table];
    } catch (e) {
      delete tableListInFlight[table];
      return [];
    }
  }

  function map(table, cb) {
    const callbackId = makeCallbackId(table);
    callbacks[table] = callbacks[table] || [];
    callbacks[table].push({ id: callbackId, cb: cb });

    ensureInit().then(function () {
      list(table).then(function (rows) {
        const still = (callbacks[table] || []).some(function (l) { return l.id === callbackId; });
        if (!still) return;
        rows.forEach(function (r) { cb(r.data, r.id); });
      });
    });

    return callbackId;
  }

  function unlisten(callbackId) {
    if (!callbackId) return false;
    for (const table of Object.keys(callbacks)) {
      const before = callbacks[table].length;
      callbacks[table] = callbacks[table].filter(function (l) { return l.id !== callbackId; });
      if (callbacks[table].length !== before) return true;
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Attachments (stored inline inside data._attachments as base64 data-URLs)
  // -------------------------------------------------------------------------
  async function putAttachment(table, id, name, dataUrlOrBlob, contentType) {
    try {
      const existing = (await get(table, id)) || {};
      const attachments = Object.assign({}, existing._attachments || {});
      let dataUrl = dataUrlOrBlob;
      if (dataUrlOrBlob instanceof Blob) {
        dataUrl = await new Promise(function (resolve, reject) {
          const reader = new FileReader();
          reader.onload = function (e) { resolve(e.target.result); };
          reader.onerror = reject;
          reader.readAsDataURL(dataUrlOrBlob);
        });
      }
      attachments[name] = { data: dataUrl, content_type: contentType || 'image/jpeg' };
      await put(table, id, Object.assign({}, existing, { _attachments: attachments }));
      return true;
    } catch (e) {
      console.error('putAttachment error', e);
      return false;
    }
  }

  async function getAttachment(table, id, name) {
    try {
      const data = await get(table, id);
      return (
        data && data._attachments && data._attachments[name] && data._attachments[name].data
      ) || null;
    } catch (e) {
      return null;
    }
  }

  async function listAttachments(table, id) {
    try {
      const data = await get(table, id);
      if (!data || !data._attachments) return [];
      return Object.entries(data._attachments).map(function ([name, att]) {
        return { name: name, dataUrl: att.data || null, content_type: att.content_type || null };
      });
    } catch (e) {
      return [];
    }
  }

  async function deleteAttachment(table, id, name) {
    try {
      const data = await get(table, id);
      if (!data || !data._attachments || !data._attachments[name]) return false;
      const attachments = Object.assign({}, data._attachments);
      delete attachments[name];
      await put(table, id, Object.assign({}, data, { _attachments: attachments }));
      return true;
    } catch (e) {
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Auto-initialise on startup (non-blocking)
  // -------------------------------------------------------------------------
  ensureInit()
    .then(function () {
      const apiUrl = getApiUrl();
      if (apiUrl && getAuthToken()) {
        startReplication();
      }
    })
    .catch(function (e) { console.warn('DB.autoInit error', e); });

  return {
    init: init,
    put: put,
    get: get,
    del: del,
    list: list,
    map: map,
    unlisten: unlisten,
    startReplication: startReplication,
    stopReplication: stopReplication,
    putAttachment: putAttachment,
    getAttachment: getAttachment,
    listAttachments: listAttachments,
    deleteAttachment: deleteAttachment,
    _internal: {
      get collection() { return collection; },
      get db() { return rxdb; },
    },
  };
})();

window.DB = DB;
