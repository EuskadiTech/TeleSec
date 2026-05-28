// Simple PouchDB wrapper for TeleSec
// - Uses PouchDB for local storage and optional replication to a CouchDB server
// - Stores records as docs with _id = "<table>:<id>" and field `data` containing either plain object or encrypted string
// - Exposes: init, put, get, del, map, list, replicate

var DB = (function () {
  const LOCAL_DB_NAME = 'telesec';

  const LIST_CACHE_TTL_MS = 1500;
  const ORB_MIN_INTERVAL_MS = 400;
  const INITIAL_REPL_BATCH_SIZE = 500;

  let local = null;
  let remote = null;

  let changes = null;
  let repPush = null;
  let repPull = null;
  let repBootstrap = null;

  let remoteKey = '';
  let onlineReplTimer = null;

  let callbackSeq = 0;
  let lastOrbAt = 0;
  let orbTimer = null;

  const callbacks = {}; // table -> [{ id, cb }]
  const docCache = {}; // _id -> snapshot
  const tableListCache = {}; // table -> { ts, rows }
  const tableListInFlight = {}; // table -> Promise

  function noop() {}

  function safe(fn, fallback) {
    try {
      return fn();
    } catch (e) {
      return fallback;
    }
  }

  function makeId(table, id) {
    return `${table}:${id}`;
  }

  function splitId(_id) {
    const sep = _id.indexOf(':');

    return {
      table: sep === -1 ? _id : _id.slice(0, sep),
      id: sep === -1 ? '' : _id.slice(sep + 1),
    };
  }

  function makeCallbackId(table) {
    callbackSeq += 1;
    return `${table}#${callbackSeq}`;
  }

  function bootstrapFlagKey(key) {
    return `TELESEC_REPL_BOOTSTRAP_DONE:${key}`;
  }

  function hasBootstrapDone(key) {
    if (!key) return true;

    return (
      safe(() => localStorage.getItem(bootstrapFlagKey(key)) === '1', false)
    );
  }

  function markBootstrapDone(key) {
    if (!key) return;

    safe(() => localStorage.setItem(bootstrapFlagKey(key), '1'));
  }

  function makeRemoteKey(opts, localName) {
    if (!opts?.remoteServer) return '';

    const server = String(opts.remoteServer).replace(/\/$/, '');
    const dbname = encodeURIComponent(opts.dbname || localName);
    const username = opts.username || '';

    return `${server}|${dbname}|${username}`;
  }

  function invalidateTableCache(table) {
    delete tableListCache[table];
  }

  function toStableSnapshot(data) {
    if (typeof data === 'string') return data;

    try {
      return JSON.stringify(data);
    } catch (e) {
      return String(data);
    }
  }

  function ensureLocal() {
    if (local) return;

    try {
      local = new PouchDB(LOCAL_DB_NAME);

      if (changes?.cancel) {
        safe(() => changes.cancel());
      }

      changes = local
        .changes({
          live: true,
          since: 'now',
          include_docs: true,
        })
        .on('change', onChange);

    } catch (e) {
      console.warn('ensureLocal error', e);
    }
  }

  function buildRemoteUrl(opts, localName) {
    const server = String(opts.remoteServer || '').replace(/\/$/, '');
    const dbname = encodeURIComponent(opts.dbname || localName);

    if (!opts.username) {
      return `${server}/${dbname}`;
    }

    const auth = `${opts.username}:${opts.password || ''}@`;

    return `${server.replace('://', `://${auth}`)}/${dbname}`;
  }

  function cancelReplication(replication) {
    if (replication?.cancel) {
      safe(() => replication.cancel());
    }
  }

  function cancelAllReplication() {
    cancelReplication(repPush);
    cancelReplication(repPull);
    cancelReplication(repBootstrap);

    repPush = null;
    repPull = null;
    repBootstrap = null;
  }

  function notifyTable(table, data, id) {
    const listeners = callbacks[table];

    if (!listeners?.length) return;

    listeners.forEach((listener) => {
      try {
        listener.cb(data, id);
      } catch (e) {
        console.error(e);
      }
    });
  }

  function updateSyncStatus(doc) {
    try {
      window.TELESEC_LAST_SYNC = Date.now();

      let payload = '';

      try {
        payload =
          typeof doc.data === 'string'
            ? doc.data
            : JSON.stringify(doc.data || {});
      } catch (e) {
        payload = String(doc._id || '');
      }

      const sample =
        payload.length > 512
          ? `${payload.slice(0, 512)}:${payload.length}`
          : payload;

      let hash = 0;

      for (let i = 0; i < sample.length; i++) {
        hash = (hash * 31 + sample.charCodeAt(i)) >>> 0;
      }

      window.TELESEC_LAST_SYNC_COLOR =
        `hsl(${hash % 360}, 70%, 50%)`;

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

        safe(() => updateStatusOrb());
      }, ORB_MIN_INTERVAL_MS - elapsed);

    } catch (e) {}
  }

  function onChange(change) {
    const doc = change?.doc;

    if (!doc?._id) return;

    const { table, id } = splitId(doc._id);

    invalidateTableCache(table);

    // Deleted
    if (change.deleted || doc._deleted) {
      delete docCache[doc._id];

      updateSyncStatus(doc);
      notifyTable(table, null, id);

      return;
    }

    // Changed?
    let changed = true;

    try {
      const snapshot = toStableSnapshot(doc.data);

      if (docCache[doc._id] === snapshot) {
        changed = false;
      }

      docCache[doc._id] = snapshot;

    } catch (e) {}

    if (!changed) return;

    updateSyncStatus(doc);
    notifyTable(table, doc.data, id);
  }

  async function encryptIfNeeded(data) {
    try {
      const isEncryptedString =
        typeof data === 'string' &&
        data.startsWith('RSA{') &&
        data.endsWith('}');

      if (
        isEncryptedString ||
        typeof TS_encrypt !== 'function' ||
        typeof SECRET === 'undefined' ||
        !SECRET
      ) {
        return data;
      }

      return await new Promise((resolve) => {
        try {
          TS_encrypt(data, SECRET, resolve);
        } catch (e) {
          resolve(data);
        }
      });

    } catch (e) {
      return data;
    }
  }

  async function getDoc(_id) {
    return local.get(_id).catch(() => null);
  }

  async function init(opts = {}) {
    try {
      if (opts.secret) {
        SECRET = opts.secret;

        safe(() =>
          localStorage.setItem('TELESEC_SECRET', SECRET)
        );
      }
    } catch (e) {}

    ensureLocal();

    const nextRemoteKey = makeRemoteKey(opts, LOCAL_DB_NAME);

    if (opts.remoteServer) {
      try {
        if (nextRemoteKey !== remoteKey || !remote) {
          remote = new PouchDB(
            buildRemoteUrl(opts, LOCAL_DB_NAME)
          );

          remoteKey = nextRemoteKey;

          replicateToRemote();
        }
      } catch (e) {
        console.warn('Remote DB init error', e);
      }
    }

    return Promise.resolve();
  }

  function replicateToRemote() {
    ensureLocal();

    if (!local || !remote) return;

    cancelAllReplication();

    const liveOpts = {
      live: true,
      retry: true,
      heartbeat: 10000,
      timeout: 60000,
      batch_size: 100,
      batches_limit: 10,
    };

    function startLiveReplication() {
      repPush = PouchDB
        .replicate(local, remote, liveOpts)
        .on('error', (err) => {
          console.warn('Replication push error', err);
        });

      repPull = PouchDB
        .replicate(remote, local, liveOpts)
        .on('error', (err) => {
          console.warn('Replication pull error', err);
        });
    }

    // Bootstrap sync first
    if (!hasBootstrapDone(remoteKey)) {
      repBootstrap = PouchDB
        .sync(local, remote, {
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

          console.warn(
            'Initial replication bootstrap error',
            err
          );

          startLiveReplication();
        });

      return;
    }

    startLiveReplication();
  }

  async function put(table, id, data) {
    ensureLocal();

    invalidateTableCache(table);

    const _id = makeId(table, id);

    try {
      const existing = await getDoc(_id);

      if (data === null) {
        if (existing) {
          await local.remove(existing);
        }

        return;
      }

      const doc = existing || { _id };

      doc.data = await encryptIfNeeded(data);
      doc.table = table;
      doc.ts = new Date().toISOString();

      if (existing?._rev) {
        doc._rev = existing._rev;
      }

      await local.put(doc);

    } catch (e) {
      console.error('DB.put error', e);
    }
  }

  async function get(table, id) {
    ensureLocal();

    try {
      const doc = await local.get(makeId(table, id));

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

    tableListInFlight[table] = local
      .allDocs({
        include_docs: true,
        startkey: `${table}:`,
        endkey: `${table}:\uffff`,
      })
      .then((res) => {
        const rows = res.rows.map((r) => {
          const { id } = splitId(r.id);

          safe(() => {
            docCache[r.id] = toStableSnapshot(r.doc.data);
          });

          return {
            id,
            data: r.doc.data,
          };
        });

        tableListCache[table] = {
          ts: Date.now(),
          rows,
        };

        return rows;
      })
      .catch(() => [])
      .finally(() => {
        delete tableListInFlight[table];
      });

    return tableListInFlight[table];
  }

  function dataURLtoBlob(dataurl) {
    const [meta, body] = dataurl.split(',');
    const mime = meta.match(/:(.*?);/)[1];

    const binary = atob(body);
    const len = binary.length;

    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: mime });
  }

  async function putAttachment(
    table,
    id,
    name,
    dataUrlOrBlob,
    contentType
  ) {
    ensureLocal();

    const _id = makeId(table, id);

    try {
      let doc = await getDoc(_id);

      if (!doc) {
        await local.put({
          _id,
          table,
          ts: new Date().toISOString(),
          data: {},
        });

        doc = await local.get(_id);
      }

      let blob = dataUrlOrBlob;

      if (
        typeof dataUrlOrBlob === 'string' &&
        dataUrlOrBlob.startsWith('data:')
      ) {
        blob = dataURLtoBlob(dataUrlOrBlob);
      }

      const type =
        contentType ||
        blob?.type ||
        'application/octet-stream';

      await local.putAttachment(
        _id,
        name,
        doc._rev,
        blob,
        type
      );

      return true;

    } catch (e) {
      console.error('putAttachment error', e);
      return false;
    }
  }

  async function getAttachment(table, id, name) {
    ensureLocal();

    try {
      const blob = await local.getAttachment(
        makeId(table, id),
        name
      );

      if (!blob) return null;

      return await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;

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
      const doc = await local.get(_id, {
        attachments: true,
      });

      if (!doc?._attachments) return [];

      const out = [];

      for (const name of Object.keys(doc._attachments)) {
        try {
          const att = doc._attachments[name];

          if (att?.data) {
            const content_type =
              att.content_type ||
              'application/octet-stream';

            out.push({
              name,
              content_type,
              dataUrl:
                `data:${content_type};base64,${att.data}`,
            });

            continue;
          }

          out.push({
            name,
            content_type: null,
            dataUrl: await getAttachment(table, id, name),
          });

        } catch (e) {
          out.push({
            name,
            content_type: null,
            dataUrl: null,
          });
        }
      }

      return out;

    } catch (e) {
      return [];
    }
  }

  async function deleteAttachment(table, id, name) {
    ensureLocal();

    try {
      const doc = await local.get(makeId(table, id));

      if (!doc?._attachments?.[name]) {
        return false;
      }

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

    callbacks[table] ||= [];
    callbacks[table].push({
      id: callbackId,
      cb,
    });

    list(table).then((rows) => {
      const stillListening =
        callbacks[table]?.some(
          (listener) => listener.id === callbackId
        );

      if (!stillListening) return;

      rows.forEach((row) => {
        cb(row.data, row.id);
      });
    });

    return callbackId;
  }

  function unlisten(callbackId) {
    if (!callbackId) return false;

    for (const table of Object.keys(callbacks)) {
      const before = callbacks[table].length;

      callbacks[table] = callbacks[table].filter(
        (listener) => listener.id !== callbackId
      );

      if (callbacks[table].length !== before) {
        return true;
      }
    }

    return false;
  }

  // Retry replication when network returns
  if (
    typeof window !== 'undefined' &&
    window.addEventListener
  ) {
    window.addEventListener('online', function () {
      safe(() => {
        clearTimeout(onlineReplTimer);

        onlineReplTimer = setTimeout(function () {
          onlineReplTimer = null;

          replicateToRemote();
        }, 1200);
      });
    });
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
    const remoteServer =
      localStorage.getItem('TELESEC_COUCH_URL') || '';

    const username =
      localStorage.getItem('TELESEC_COUCH_USER') || '';

    const password =
      localStorage.getItem('TELESEC_COUCH_PASS') || '';

    const dbname =
      localStorage.getItem('TELESEC_COUCH_DBNAME') || undefined;

    try {
      SECRET =
        localStorage.getItem('TELESEC_SECRET') || '';
    } catch (e) {
      SECRET = '';
    }

    DB.init({
      remoteServer,
      username,
      password,
      dbname,
    }).catch((e) =>
      console.warn('DB.autoInit error', e)
    );

  } catch (e) {
    console.warn('DB.autoInit unexpected error', e);
  }
})();
