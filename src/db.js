// Simple PouchDB wrapper for TeleSec
// - Uses PouchDB for local storage and optional replication to a CouchDB server
// - Stores records as docs with _id = "<table>:<id>" and field `data` containing either plain object or encrypted string
// - Exposes: init, put, get, del, map, list, replicate

var DB = (function () {
  let local = null;
  let secret = null;
  let remote = null;
  let changes = null;
  let callbacks = {}; // table -> [cb]

  function makeId(table, id) {
    return table + ':' + id;
  }

  function init(opts) {
    // opts: { secret, remoteServer, username, password, dbname }
    secret = opts.secret || '';
    const localName = opts.dbname || localStorage.getItem('TELESEC_COUCH_DBNAME') || 'telesec';
    local = new PouchDB(localName);

    if (opts.remoteServer) {
      try {
        const server = opts.remoteServer.replace(/\/$/, '');
        const dbname = encodeURIComponent((opts.dbname || localName));
        let authPart = '';
        if (opts.username) {
          authPart = opts.username + ':' + (opts.password || '') + '@';
        }
        const remoteUrl = server.replace(/https?:\/\//, (m) => m) + '/' + dbname;
        // to keep things simple, embed credentials if provided
        if (opts.username) {
          remote = new PouchDB(remoteUrl.replace(/:\/\//, '://' + authPart));
        } else {
          remote = new PouchDB(remoteUrl);
        }
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
    if (!local || !remote) return;
    PouchDB.replicate(local, remote, { live: true, retry: true }).on('error', function (err) {
      console.warn('Replication error', err);
    });
    PouchDB.replicate(remote, local, { live: true, retry: true }).on('error', function (err) {
      console.warn('Replication error', err);
    });
  }

  function onChange(change) {
    const doc = change.doc;
    if (!doc || !doc._id) return;
    const [table, id] = doc._id.split(':');
    if (!callbacks[table]) return;
    callbacks[table].forEach((cb) => {
      try { cb(doc.data, id); } catch (e) { console.error(e); }
    });
  }

  async function put(table, id, data) {
    const _id = makeId(table, id);
    try {
      const existing = await local.get(_id).catch(() => null);
      if (data === null) {
        // delete
        if (existing) {
          await local.remove(existing);
        }
        return;
      }
      const doc = existing || { _id: _id };
      doc.data = data;
      doc.table = table;
      doc.ts = new Date().toISOString();
      if (existing) doc._rev = existing._rev;
      await local.put(doc);
    } catch (e) {
      console.error('DB.put error', e);
    }
  }

  async function get(table, id) {
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
    try {
      const res = await local.allDocs({ include_docs: true, startkey: table + ':', endkey: table + ':\uffff' });
      return res.rows.map(r => {
        const id = r.id.split(':')[1];
        return { id: id, data: r.doc.data };
      });
    } catch (e) { return []; }
  }

  function map(table, cb) {
    callbacks[table] = callbacks[table] || [];
    callbacks[table].push(cb);
    // initial load
    list(table).then(rows => rows.forEach(r => cb(r.data, r.id)));
    // return unsubscribe
    return () => {
      callbacks[table] = callbacks[table].filter(x => x !== cb);
    }
  }

  return {
    init,
    put,
    get,
    del,
    list,
    map,
    replicateToRemote,
    _internal: { local }
  };
})();

window.DB = DB;
