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
  let callbacks = {}; // table -> [cb]
  let docCache = {}; // _id -> last data snapshot (stringified)

  function ensureLocal() {
    if (local) return;
    try {
      const localName = 'telesec';
      local = new PouchDB(localName);
      if (changes) {
        try { changes.cancel(); } catch (e) {}
      }
      changes = local.changes({ live: true, since: 'now', include_docs: true }).on('change', onChange);
    } catch (e) {
      console.warn('ensureLocal error', e);
    }
  }

  function makeId(table, id) {
    return table + ':' + id;
  }

  function init(opts) {
    const localName = 'telesec';
    try {
      if (opts && opts.secret) {
        SECRET = opts.secret;
        try { localStorage.setItem('TELESEC_SECRET', SECRET); } catch (e) {}
      }
    } catch (e) {}
    local = new PouchDB(localName);

    if (opts.remoteServer) {
      try {
        const server = opts.remoteServer.replace(/\/$/, '');
        const dbname = encodeURIComponent((opts.dbname || localName));
        let authPart = '';
        if (opts.username) authPart = opts.username + ':' + (opts.password || '') + '@';
        const remoteUrl = server.replace(/https?:\/\//, (m) => m) + '/' + dbname;
        if (opts.username) remote = new PouchDB(remoteUrl.replace(/:\/\//, '://' + authPart));
        else remote = new PouchDB(remoteUrl);
        replicateToRemote();
      } catch (e) {
        console.warn('Remote DB init error', e);
      }
    }

    if (changes) changes.cancel();
    changes = local.changes({ live: true, since: 'now', include_docs: true }).on('change', onChange);
    return Promise.resolve();
  }

  function replicateToRemote() {
    ensureLocal();
    if (!local || !remote) return;
    try { if (repPush && repPush.cancel) repPush.cancel(); } catch (e) {}
    try { if (repPull && repPull.cancel) repPull.cancel(); } catch (e) {}

    repPush = PouchDB.replicate(local, remote, { live: true, retry: true })
      .on('error', function (err) { console.warn('Replication push error', err); });
    repPull = PouchDB.replicate(remote, local, { live: true, retry: true })
      .on('error', function (err) { console.warn('Replication pull error', err); });
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', function () {
      try { setTimeout(replicateToRemote, 1000); } catch (e) {}
    });
  }

  function onChange(change) {
    const doc = change.doc;
    if (!doc || !doc._id) return;
    const [table, id] = doc._id.split(':');

    // handle deletes
    if (change.deleted || doc._deleted) {
      delete docCache[doc._id];
      if (callbacks[table]) {
        callbacks[table].forEach(cb => {
          try { cb(null, id); } catch (e) { console.error(e); }
        });
      }
      return;
    }

    // handle insert/update
    try {
      const now = typeof doc.data === 'string' ? doc.data : JSON.stringify(doc.data);
      const prev = docCache[doc._id];
      if (prev === now) return; // no meaningful change
      docCache[doc._id] = now;
    } catch (e) { /* ignore cache errors */ }

    if (callbacks[table]) {
      callbacks[table].forEach(cb => {
        try { cb(doc.data, id); } catch (e) { console.error(e); }
      });
    }
  }

  async function put(table, id, data) {
    ensureLocal();
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
        var isEncryptedString = (typeof data === 'string' && data.startsWith('RSA{') && data.endsWith('}'));
        if (!isEncryptedString && typeof TS_encrypt === 'function' && typeof SECRET !== 'undefined' && SECRET) {
          toStore = await new Promise(resolve => {
            try { TS_encrypt(data, SECRET, enc => resolve(enc)); } catch (e) { resolve(data); }
          });
        }
      } catch (e) { toStore = data; }
      doc.data = toStore;
      doc.table = table;
      doc.ts = new Date().toISOString();
      if (existing) doc._rev = existing._rev;
      await local.put(doc);

      // FIX: manually trigger map() callbacks for local update
      // onChange will update docCache and notify all subscribers
      onChange({ doc: doc });

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
    } catch (e) { return null; }
  }

  async function del(table, id) { return put(table, id, null); }

  async function list(table) {
    ensureLocal();
    try {
      const res = await local.allDocs({ include_docs: true, startkey: table + ':', endkey: table + ':\uffff' });
      return res.rows.map(r => {
        const id = r.id.split(':')[1];
        try { docCache[r.id] = typeof r.doc.data === 'string' ? r.doc.data : JSON.stringify(r.doc.data); } catch (e) {}
        return { id: id, data: r.doc.data };
      });
    } catch (e) { return []; }
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
      if (typeof dataUrlOrBlob === 'string' && dataUrlOrBlob.indexOf('data:') === 0) blob = dataURLtoBlob(dataUrlOrBlob);
      const type = contentType || (blob && blob.type) || 'application/octet-stream';
      await local.putAttachment(_id, name, doc._rev, blob, type);
      return true;
    } catch (e) { console.error('putAttachment error', e); return false; }
  }

  async function getAttachment(table, id, name) {
    ensureLocal();
    const _id = makeId(table, id);
    try {
      const blob = await local.getAttachment(_id, name);
      if (!blob) return null;
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsDataURL(blob);
      });
    } catch (e) { return null; }
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
          } catch (e) { out.push({ name: name, dataUrl: null, content_type: null }); }
        }
        return out;
      } catch (e2) { return []; }
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
    } catch (e) { console.error('deleteAttachment error', e); return false; }
  }

  function map(table, cb) {
    ensureLocal();
    callbacks[table] = callbacks[table] || [];
    callbacks[table].push(cb);
    list(table).then(rows => rows.forEach(r => cb(r.data, r.id)));
    return () => { callbacks[table] = callbacks[table].filter(x => x !== cb); }
  }

  return {
    init,
    put,
    get,
    del,
    list,
    map,
    replicateToRemote,
    listAttachments,
    deleteAttachment,
    putAttachment,
    getAttachment,
    _internal: { local }
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
    try { SECRET = localStorage.getItem('TELESEC_SECRET') || ''; } catch (e) { SECRET = ''; }
    DB.init({ remoteServer, username, password, dbname }).catch(e => console.warn('DB.autoInit error', e));
  } catch (e) { console.warn('DB.autoInit unexpected error', e); }
})();
