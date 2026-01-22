// TeleSec Database Layer - Supports both PouchDB and remoteStorage.js
// - Users can choose their preferred backend via login settings
// - Provides unified API: init, put, get, del, map, list, replicate
// - Stores records as docs with _id = "<table>:<id>" and field `data` containing either plain object or encrypted string

var DB = (function () {
  // Constants
  const ENCRYPTED_PREFIX = 'RSA{';
  const ENCRYPTED_SUFFIX = '}';
  
  let backend = null; // 'pouchdb' or 'remotestorage'
  let callbacks = {}; // table -> [cb]
  let docCache = {}; // _id -> last data snapshot (stringified)

  // PouchDB-specific state
  let pouchLocal = null;
  let pouchRemote = null;
  let pouchChanges = null;
  let pouchRepPush = null;
  let pouchRepPull = null;

  // remoteStorage-specific state
  let rsClient = null;
  let rsModule = null;

  // ==================== PouchDB Backend Implementation ====================
  
  function ensurePouchLocal() {
    if (pouchLocal) return;
    try {
      const localName = 'telesec';
      pouchLocal = new PouchDB(localName);
      if (pouchChanges) {
        try { pouchChanges.cancel(); } catch (e) {}
      }
      pouchChanges = pouchLocal.changes({ live: true, since: 'now', include_docs: true }).on('change', onPouchChange);
    } catch (e) {
      console.warn('ensurePouchLocal error', e);
    }
  }

  function onPouchChange(change) {
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

  async function initPouchDB(opts) {
    const localName = 'telesec';
    try {
      if (opts && opts.secret) {
        SECRET = opts.secret;
        try { localStorage.setItem('TELESEC_SECRET', SECRET); } catch (e) {}
      }
    } catch (e) {}
    pouchLocal = new PouchDB(localName);

    if (opts.remoteServer) {
      try {
        const server = opts.remoteServer.replace(/\/$/, '');
        const dbname = encodeURIComponent((opts.dbname || localName));
        let authPart = '';
        if (opts.username) authPart = opts.username + ':' + (opts.password || '') + '@';
        const remoteUrl = server.replace(/https?:\/\//, (m) => m) + '/' + dbname;
        if (opts.username) pouchRemote = new PouchDB(remoteUrl.replace(/:\/\//, '://' + authPart));
        else pouchRemote = new PouchDB(remoteUrl);
        replicatePouchToRemote();
      } catch (e) {
        console.warn('PouchDB Remote init error', e);
      }
    }

    if (pouchChanges) pouchChanges.cancel();
    pouchChanges = pouchLocal.changes({ live: true, since: 'now', include_docs: true }).on('change', onPouchChange);
    return Promise.resolve();
  }

  function replicatePouchToRemote() {
    ensurePouchLocal();
    if (!pouchLocal || !pouchRemote) return;
    try { if (pouchRepPush && pouchRepPush.cancel) pouchRepPush.cancel(); } catch (e) {}
    try { if (pouchRepPull && pouchRepPull.cancel) pouchRepPull.cancel(); } catch (e) {}

    pouchRepPush = PouchDB.replicate(pouchLocal, pouchRemote, { live: true, retry: true })
      .on('error', function (err) { console.warn('Replication push error', err); });
    pouchRepPull = PouchDB.replicate(pouchRemote, pouchLocal, { live: true, retry: true })
      .on('error', function (err) { console.warn('Replication pull error', err); });
  }

  async function pouchPut(table, id, data) {
    ensurePouchLocal();
    const _id = table + ':' + id;
    try {
      const existing = await pouchLocal.get(_id).catch(() => null);
      if (data === null) {
        if (existing) await pouchLocal.remove(existing);
        return;
      }
      const doc = existing || { _id: _id };
      var toStore = data;
      try {
        var isEncryptedString = (typeof data === 'string' && data.startsWith(ENCRYPTED_PREFIX) && data.endsWith(ENCRYPTED_SUFFIX));
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
      await pouchLocal.put(doc);

      // manually trigger callbacks for local update
      onPouchChange({ doc: doc });
    } catch (e) {
      console.error('PouchDB.put error', e);
    }
  }

  async function pouchGet(table, id) {
    ensurePouchLocal();
    const _id = table + ':' + id;
    try {
      const doc = await pouchLocal.get(_id);
      return doc.data;
    } catch (e) { return null; }
  }

  async function pouchList(table) {
    ensurePouchLocal();
    try {
      const res = await pouchLocal.allDocs({ include_docs: true, startkey: table + ':', endkey: table + ':\uffff' });
      return res.rows.map(r => {
        const id = r.id.split(':')[1];
        try { docCache[r.id] = typeof r.doc.data === 'string' ? r.doc.data : JSON.stringify(r.doc.data); } catch (e) {}
        return { id: id, data: r.doc.data };
      });
    } catch (e) { return []; }
  }

  function pouchMap(table, cb) {
    ensurePouchLocal();
    callbacks[table] = callbacks[table] || [];
    callbacks[table].push(cb);
    pouchList(table).then(rows => rows.forEach(r => cb(r.data, r.id)));
    return () => { callbacks[table] = callbacks[table].filter(x => x !== cb); }
  }

  // PouchDB Attachment methods
  function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  }

  async function pouchPutAttachment(table, id, name, dataUrlOrBlob, contentType) {
    ensurePouchLocal();
    const _id = table + ':' + id;
    try {
      let doc = await pouchLocal.get(_id).catch(() => null);
      if (!doc) {
        await pouchLocal.put({ _id: _id, table: table, ts: new Date().toISOString(), data: {} });
        doc = await pouchLocal.get(_id);
      }
      let blob = dataUrlOrBlob;
      if (typeof dataUrlOrBlob === 'string' && dataUrlOrBlob.indexOf('data:') === 0) blob = dataURLtoBlob(dataUrlOrBlob);
      const type = contentType || (blob && blob.type) || 'application/octet-stream';
      await pouchLocal.putAttachment(_id, name, doc._rev, blob, type);
      return true;
    } catch (e) { console.error('putAttachment error', e); return false; }
  }

  async function pouchGetAttachment(table, id, name) {
    ensurePouchLocal();
    const _id = table + ':' + id;
    try {
      const blob = await pouchLocal.getAttachment(_id, name);
      if (!blob) return null;
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsDataURL(blob);
      });
    } catch (e) { return null; }
  }

  async function pouchListAttachments(table, id) {
    ensurePouchLocal();
    const _id = table + ':' + id;
    try {
      const doc = await pouchLocal.get(_id, { attachments: true });
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
          const durl = await pouchGetAttachment(table, id, name);
          out.push({ name: name, dataUrl: durl, content_type: null });
        } catch (e) {
          out.push({ name: name, dataUrl: null, content_type: null });
        }
      }
      return out;
    } catch (e) {
      try {
        const doc = await pouchLocal.get(_id).catch(() => null);
        if (!doc || !doc._attachments) return [];
        const out = [];
        for (const name of Object.keys(doc._attachments)) {
          try {
            const durl = await pouchGetAttachment(table, id, name);
            out.push({ name: name, dataUrl: durl, content_type: null });
          } catch (e) { out.push({ name: name, dataUrl: null, content_type: null }); }
        }
        return out;
      } catch (e2) { return []; }
    }
  }

  async function pouchDeleteAttachment(table, id, name) {
    ensurePouchLocal();
    const _id = table + ':' + id;
    try {
      const doc = await pouchLocal.get(_id);
      if (!doc || !doc._attachments || !doc._attachments[name]) return false;
      delete doc._attachments[name];
      await pouchLocal.put(doc);
      return true;
    } catch (e) { console.error('deleteAttachment error', e); return false; }
  }

  // ==================== remoteStorage Backend Implementation ====================

  function initRemoteStorage(opts) {
    try {
      if (opts && opts.secret) {
        SECRET = opts.secret;
        try { localStorage.setItem('TELESEC_SECRET', SECRET); } catch (e) {}
      }

      // Initialize RemoteStorage client
      rsClient = new RemoteStorage({ logging: opts.logging || false });

      // Define TeleSec data module
      rsClient.access.claim('telesec', 'rw');
      rsClient.caching.enable('/telesec/');

      // Define module to handle our data structure
      rsModule = rsClient.scope('/telesec/');

      // Listen for changes
      rsModule.on('change', onRemoteStorageChange);

      // Auto-connect if user address is provided
      if (opts.rsUserAddress) {
        rsClient.connect(opts.rsUserAddress, opts.rsToken || undefined).then(() => {
          console.log('RemoteStorage connected successfully');
        }).catch((err) => {
          console.warn('RemoteStorage connection error', err);
        });
      }

      return Promise.resolve();
    } catch (e) {
      console.error('RemoteStorage init error', e);
      return Promise.reject(e);
    }
  }

  function onRemoteStorageChange(event) {
    try {
      if (!event || !event.path) return;
      
      // Parse path: /telesec/table/id
      const pathParts = event.path.split('/').filter(p => p);
      if (pathParts.length < 3 || pathParts[0] !== 'telesec') return;
      
      const table = pathParts[1];
      const id = pathParts[2];
      const _id = table + ':' + id;

      // Handle deletion
      if (!event.newValue) {
        delete docCache[_id];
        if (callbacks[table]) {
          callbacks[table].forEach(cb => {
            try { cb(null, id); } catch (e) { console.error(e); }
          });
        }
        return;
      }

      // Handle insert/update
      try {
        const data = event.newValue;
        const now = typeof data === 'string' ? data : JSON.stringify(data);
        const prev = docCache[_id];
        if (prev === now) return; // no meaningful change
        docCache[_id] = now;

        if (callbacks[table]) {
          callbacks[table].forEach(cb => {
            try { cb(data, id); } catch (e) { console.error(e); }
          });
        }
      } catch (e) {
        console.error('RemoteStorage change handler error', e);
      }
    } catch (e) {
      console.error('onRemoteStorageChange error', e);
    }
  }

  async function rsPut(table, id, data) {
    if (!rsModule) throw new Error('RemoteStorage not initialized');
    try {
      const path = table + '/' + id;
      if (data === null) {
        await rsModule.remove(path);
        // Trigger change manually
        onRemoteStorageChange({ path: '/telesec/' + path, newValue: null });
        return;
      }

      var toStore = data;
      try {
        var isEncryptedString = (typeof data === 'string' && data.startsWith(ENCRYPTED_PREFIX) && data.endsWith(ENCRYPTED_SUFFIX));
        if (!isEncryptedString && typeof TS_encrypt === 'function' && typeof SECRET !== 'undefined' && SECRET) {
          toStore = await new Promise(resolve => {
            try { TS_encrypt(data, SECRET, enc => resolve(enc)); } catch (e) { resolve(data); }
          });
        }
      } catch (e) { toStore = data; }

      await rsModule.storeObject('application/json', path, toStore);
      // Trigger change manually for immediate UI update
      onRemoteStorageChange({ path: '/telesec/' + path, newValue: toStore });
    } catch (e) {
      console.error('RemoteStorage.put error', e);
    }
  }

  async function rsGet(table, id) {
    if (!rsModule) return null;
    try {
      const path = table + '/' + id;
      const data = await rsModule.getObject(path);
      return data || null;
    } catch (e) {
      return null;
    }
  }

  async function rsList(table) {
    if (!rsModule) return [];
    try {
      const listing = await rsModule.getListing(table + '/');
      if (!listing) return [];
      
      const results = [];
      for (const filename of Object.keys(listing)) {
        // Remove trailing slash if present, otherwise use as-is
        const id = filename.endsWith('/') ? filename.slice(0, -1) : filename;
        try {
          const data = await rsGet(table, id);
          if (data !== null) {
            results.push({ id: id, data: data });
            const _id = table + ':' + id;
            try { docCache[_id] = typeof data === 'string' ? data : JSON.stringify(data); } catch (e) {}
          }
        } catch (e) {
          console.warn('Error loading item ' + id, e);
        }
      }
      return results;
    } catch (e) {
      console.warn('RemoteStorage.list error', e);
      return [];
    }
  }

  function rsMap(table, cb) {
    if (!rsModule) return () => {};
    callbacks[table] = callbacks[table] || [];
    callbacks[table].push(cb);
    rsList(table).then(rows => rows.forEach(r => cb(r.data, r.id)));
    return () => { callbacks[table] = callbacks[table].filter(x => x !== cb); }
  }

  // RemoteStorage doesn't have built-in attachment support, store as base64 strings
  async function rsPutAttachment(table, id, name, dataUrlOrBlob, contentType) {
    if (!rsModule) return false;
    try {
      let dataUrl = dataUrlOrBlob;
      if (dataUrlOrBlob instanceof Blob) {
        dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.readAsDataURL(dataUrlOrBlob);
        });
      }
      const path = table + '/' + id + '/attachments/' + name;
      await rsModule.storeObject('application/json', path, { dataUrl: dataUrl, contentType: contentType });
      return true;
    } catch (e) {
      console.error('RemoteStorage putAttachment error', e);
      return false;
    }
  }

  async function rsGetAttachment(table, id, name) {
    if (!rsModule) return null;
    try {
      const path = table + '/' + id + '/attachments/' + name;
      const obj = await rsModule.getObject(path);
      return obj ? obj.dataUrl : null;
    } catch (e) {
      return null;
    }
  }

  async function rsListAttachments(table, id) {
    if (!rsModule) return [];
    try {
      const path = table + '/' + id + '/attachments/';
      const listing = await rsModule.getListing(path);
      if (!listing) return [];
      
      const results = [];
      for (const filename of Object.keys(listing)) {
        // Remove trailing slash if present, otherwise use as-is
        const name = filename.endsWith('/') ? filename.slice(0, -1) : filename;
        try {
          const att = await rsGetAttachment(table, id, name);
          results.push({ name: name, dataUrl: att, content_type: null });
        } catch (e) {
          results.push({ name: name, dataUrl: null, content_type: null });
        }
      }
      return results;
    } catch (e) {
      return [];
    }
  }

  async function rsDeleteAttachment(table, id, name) {
    if (!rsModule) return false;
    try {
      const path = table + '/' + id + '/attachments/' + name;
      await rsModule.remove(path);
      return true;
    } catch (e) {
      console.error('RemoteStorage deleteAttachment error', e);
      return false;
    }
  }

  // ==================== Unified Public API ====================

  async function init(opts) {
    backend = opts.backend || localStorage.getItem('TELESEC_BACKEND') || 'pouchdb';
    
    // Save backend preference
    try {
      localStorage.setItem('TELESEC_BACKEND', backend);
    } catch (e) {}

    if (backend === 'remotestorage') {
      return initRemoteStorage(opts);
    } else {
      return initPouchDB(opts);
    }
  }

  async function put(table, id, data) {
    if (backend === 'remotestorage') return rsPut(table, id, data);
    else return pouchPut(table, id, data);
  }

  async function get(table, id) {
    if (backend === 'remotestorage') return rsGet(table, id);
    else return pouchGet(table, id);
  }

  async function del(table, id) {
    return put(table, id, null);
  }

  async function list(table) {
    if (backend === 'remotestorage') return rsList(table);
    else return pouchList(table);
  }

  function map(table, cb) {
    if (backend === 'remotestorage') return rsMap(table, cb);
    else return pouchMap(table, cb);
  }

  function replicateToRemote() {
    if (backend === 'pouchdb') replicatePouchToRemote();
    // remoteStorage syncs automatically
  }

  async function putAttachment(table, id, name, dataUrlOrBlob, contentType) {
    if (backend === 'remotestorage') return rsPutAttachment(table, id, name, dataUrlOrBlob, contentType);
    else return pouchPutAttachment(table, id, name, dataUrlOrBlob, contentType);
  }

  async function getAttachment(table, id, name) {
    if (backend === 'remotestorage') return rsGetAttachment(table, id, name);
    else return pouchGetAttachment(table, id, name);
  }

  async function listAttachments(table, id) {
    if (backend === 'remotestorage') return rsListAttachments(table, id);
    else return pouchListAttachments(table, id);
  }

  async function deleteAttachment(table, id, name) {
    if (backend === 'remotestorage') return rsDeleteAttachment(table, id, name);
    else return pouchDeleteAttachment(table, id, name);
  }

  // Listen for online event (PouchDB only)
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', function () {
      try { setTimeout(replicateToRemote, 1000); } catch (e) {}
    });
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
    getBackend: () => backend,
    _internal: { 
      pouchLocal: () => pouchLocal,
      rsClient: () => rsClient 
    }
  };
})();

window.DB = DB;

// Auto-initialize DB on startup using saved settings (non-blocking)
(function autoInitDB() {
  try {
    const savedBackend = localStorage.getItem('TELESEC_BACKEND') || 'pouchdb';
    const remoteServer = localStorage.getItem('TELESEC_COUCH_URL') || '';
    const username = localStorage.getItem('TELESEC_COUCH_USER') || '';
    const password = localStorage.getItem('TELESEC_COUCH_PASS') || '';
    const dbname = localStorage.getItem('TELESEC_COUCH_DBNAME') || undefined;
    const rsUserAddress = localStorage.getItem('TELESEC_RS_USER') || '';
    const rsToken = localStorage.getItem('TELESEC_RS_TOKEN') || '';
    
    try { SECRET = localStorage.getItem('TELESEC_SECRET') || ''; } catch (e) { SECRET = ''; }
    
    const opts = {
      backend: savedBackend,
      secret: SECRET,
      remoteServer,
      username,
      password,
      dbname,
      rsUserAddress,
      rsToken
    };
    
    DB.init(opts).catch(e => console.warn('DB.autoInit error', e));
  } catch (e) { console.warn('DB.autoInit unexpected error', e); }
})();
