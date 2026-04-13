// db.js – SocketIO-based real-time database client for TeleSec
//
// Replaces RxDB with SocketIO for real-time data access with RBAC enforcement.
// All operations are protected by JWT authentication and role-based access control.

const DEFAULT_SERVER = 'https://tele.tech.eus';

var DB = (function () {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  let socket = null;
  let connected = false;
  let initPromise = null;
  let jwt_token = null;

  let callbacks = {}; // table -> [{ id, cb }]
  let callbackSeq = 0;
  let tableListCache = {}; // table -> { ts, rows }
  let tableListInFlight = {}; // table -> Promise<rows>
  let subscriptions = {}; // table -> boolean (subscribed)
  let lastSyncCheck = 0;
  let syncTimer = null;

  const LIST_CACHE_TTL_MS = 1500;
  const SYNC_CHECK_INTERVAL_MS = 5000;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function getApiUrl() {
    return (localStorage.getItem('TELESEC_API_URL') || DEFAULT_SERVER).replace(/\/$/, '');
  }

  function getAuthToken() {
    return jwt_token || localStorage.getItem('TELESEC_JWT') || '';
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
      updateStatusOrb();
    } catch (e) {}
  }

  // -------------------------------------------------------------------------
  // SocketIO connection
  // -------------------------------------------------------------------------
  async function _connectSocket() {
    if (socket) return socket;

    return new Promise(function (resolve, reject) {
      const apiUrl = getApiUrl();
      const token = getAuthToken();

      // More tolerant: allow retry later if token becomes available
      if (!apiUrl) {
        console.warn('DB: No API URL set yet');
        reject(new Error('API URL not configured'));
        return;
      }

      if (!token) {
        console.warn('DB: No JWT token available yet (user not logged in)');
        reject(new Error('JWT token not available (user not logged in)'));
        return;
      }

      // Load socket.io client if not already loaded
      if (typeof io === 'undefined') {
        const script = document.createElement('script');
        script.src = apiUrl + '/socket.io/socket.io.js';
        script.onload = function () {
          _createSocketConnection(apiUrl, token, resolve, reject);
        };
        script.onerror = function () {
          // Use CDN fallback if loading from server fails
          console.warn('Failed to load socket.io from server, falling back to CDN');
          const cdnScript = document.createElement('script');
          cdnScript.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
          cdnScript.onload = function () {
            _createSocketConnection(apiUrl, token, resolve, reject);
          };
          cdnScript.onerror = function () {
            reject(new Error('Failed to load socket.io client library'));
          };
          document.head.appendChild(cdnScript);
        };
        document.head.appendChild(script);
      } else {
        _createSocketConnection(apiUrl, token, resolve, reject);
      }
    });
  }

  function _createSocketConnection(apiUrl, token, resolve, reject) {
    socket = io(apiUrl, {
      auth: {
        token: token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', function () {
      connected = true;
      updateSyncStatus();
      _resubscribeAll();
      resolve(socket);
    });

    socket.on('connect_error', function (error) {
      console.warn('Socket connection error:', error);
    });

    socket.on('disconnect', function () {
      connected = false;
      console.warn('Socket disconnected');
    });

    socket.on('error', function (error) {
      console.error('Socket error:', error);
    });

    // Listen for real-time data changes
    socket.on('db:changed', function (data) {
      try {
        const table = data.table;
        const id = data.id;

        invalidateTableCache(table);
        updateSyncStatus();

        if (data.event === 'del') {
          (callbacks[table] || []).forEach(function (l) {
            try {
              l.cb(null, id);
            } catch (e) {
              console.error(e);
            }
          });
          return;
        }

        if (data.event === 'put' && data.data) {
          (callbacks[table] || []).forEach(function (l) {
            try {
              l.cb(data.data, id);
            } catch (e) {
              console.error(e);
            }
          });
        }
      } catch (e) {
        console.warn('DB change handler error', e);
      }
    });
  }

  function _resubscribeAll() {
    for (const table of Object.keys(subscriptions)) {
      if (subscriptions[table]) {
        _subscribe(table);
      }
    }
  }

  function _subscribe(table) {
    if (!socket || !connected) return;
    socket.emit('db:subscribe', { table: table });
  }

  function _unsubscribe(table) {
    if (!socket || !connected) return;
    socket.emit('db:unsubscribe', { table: table });
  }

  function ensureInit() {
    if (!initPromise) {
      // Create a new promise for this initialization attempt
      initPromise = _connectSocket().catch(function (err) {
        // Reset so next call tries again
        initPromise = null;
        throw err;
      });
    }
    return initPromise;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  async function init(opts) {
    opts = opts || {};
    if (opts.jwt) {
      jwt_token = opts.jwt;
      // Reset connection if token changed (e.g., after login)
      if (socket) {
        try {
          socket.disconnect();
        } catch (e) {}
        socket = null;
        connected = false;
        initPromise = null; // Force reconnection
      }
    }
    try {
      await ensureInit();
      console.debug('DB.init: Connected successfully');
      return Promise.resolve();
    } catch (e) {
      console.warn('DB.init error:', e.message);
      // Return resolved promise anyway - user might not be logged in yet
      // Subsequent operations will handle the lack of connection
      return Promise.resolve();
    }
  }

  async function put(table, id, data) {
    await ensureInit().catch(function (e) {
      // Continue even if init fails - will fail with better error below
    });
    invalidateTableCache(table);

    return new Promise(function (resolve, reject) {
      if (!socket || !connected) {
        reject(new Error('Not connected to server. Please log in.'));
        return;
      }

      const timeout = setTimeout(function () {
        reject(new Error('db:put timeout'));
      }, 10000);

      socket.once('db:put', function (response) {
        clearTimeout(timeout);
        if (response.status === 'ok') {
          resolve();
        } else {
          reject(new Error(response.message || 'Unknown error'));
        }
      });

      socket.once('db:error', function (response) {
        clearTimeout(timeout);
        reject(new Error(response.message || 'Unknown error'));
      });

      socket.emit('db:put', {
        table: table,
        id: id,
        data: data,
      });
    });
  }

  async function get(table, id) {
    await ensureInit();

    return new Promise(function (resolve, reject) {
      if (!socket) {
        resolve(null);
        return;
      }

      const timeout = setTimeout(function () {
        resolve(null);
      }, 5000);

      socket.once('db:get', function (response) {
        clearTimeout(timeout);
        resolve(response.data);
      });

      socket.emit('db:get', {
        table: table,
        id: id,
      });
    });
  }

  async function del(table, id) {
    await ensureInit().catch(function (e) {
      // Continue even if init fails - will fail with better error below
    });
    invalidateTableCache(table);

    return new Promise(function (resolve, reject) {
      if (!socket || !connected) {
        reject(new Error('Not connected to server. Please log in.'));
        return;
      }

      const timeout = setTimeout(function () {
        reject(new Error('db:del timeout'));
      }, 10000);

      socket.once('db:del', function (response) {
        clearTimeout(timeout);
        if (response.status === 'ok') {
          resolve();
        } else {
          reject(new Error(response.message || 'Unknown error'));
        }
      });

      socket.once('db:error', function (response) {
        clearTimeout(timeout);
        reject(new Error(response.message || 'Unknown error'));
      });

      socket.emit('db:del', {
        table: table,
        id: id,
      });
    });
  }

  async function list(table) {
    await ensureInit().catch(function (e) {
      // Continue even if init fails - will fail with better error below
    });

    const now = Date.now();
    const cached = tableListCache[table];
    if (cached && now - cached.ts <= LIST_CACHE_TTL_MS) {
      return cached.rows;
    }

    if (tableListInFlight[table]) {
      return tableListInFlight[table];
    }

    tableListInFlight[table] = new Promise(function (resolve, reject) {
      if (!socket || !connected) {
        reject(new Error('Not connected to server. Please log in.'));
        return;
      }

      const timeout = setTimeout(function () {
        resolve([]);
      }, 10000);

      socket.once('db:list', function (response) {
        clearTimeout(timeout);
        if (response.table === table) {
          const rows = response.rows || [];
          tableListCache[table] = { ts: Date.now(), rows: rows };
          resolve(rows);
        } else {
          resolve([]);
        }
      });

      socket.once('db:error', function (response) {
        clearTimeout(timeout);
        resolve([]);
      });

      socket.emit('db:list', {
        table: table,
      });
    }).finally(function () {
      delete tableListInFlight[table];
    });

    return tableListInFlight[table];
  }

  function map(table, cb) {
    const callbackId = makeCallbackId(table);
    callbacks[table] = callbacks[table] || [];
    callbacks[table].push({ id: callbackId, cb: cb });

    // Subscribe to real-time updates if socket is ready
    ensureInit().then(function () {
      _subscribe(table);
      subscriptions[table] = true;

      // Fetch current list
      list(table)
        .then(function (rows) {
          const still = (callbacks[table] || []).some(function (l) {
            return l.id === callbackId;
          });
          if (!still) return;
          rows.forEach(function (r) {
            cb(r.data, r.id);
          });
        })
        .catch(function (e) {
          console.error('Error loading table:', e);
        });
    });

    return callbackId;
  }

  function unlisten(callbackId) {
    if (!callbackId) return false;
    for (const table of Object.keys(callbacks)) {
      const before = callbacks[table].length;
      callbacks[table] = callbacks[table].filter(function (l) {
        return l.id !== callbackId;
      });
      if (callbacks[table].length !== before) {
        // If no more callbacks for this table, unsubscribe
        if (callbacks[table].length === 0) {
          _unsubscribe(table);
          subscriptions[table] = false;
        }
        return true;
      }
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
          reader.onload = function (e) {
            resolve(e.target.result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(dataUrlOrBlob);
        });
      }

      attachments[name] = {
        data: dataUrl,
        content_type: contentType || 'image/jpeg',
      };
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
        (data &&
          data._attachments &&
          data._attachments[name] &&
          data._attachments[name].data) ||
        null
      );
    } catch (e) {
      return null;
    }
  }

  async function listAttachments(table, id) {
    try {
      const data = await get(table, id);
      if (!data || !data._attachments) return [];
      return Object.entries(data._attachments).map(function ([name, att]) {
        return {
          name: name,
          dataUrl: att.data || null,
          content_type: att.content_type || null,
        };
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
  // Try to initialize, but don't fail if token isn't available yet
  // The token will be available after user logs in and DB.init() is called
  setTimeout(function () {
    ensureInit().catch(function (e) {
      // Non-blocking: just log if initial connection fails
      // This is expected if user hasn't logged in yet
      if (e.message.includes('not logged in') || e.message.includes('not configured')) {
        console.debug('DB: Waiting for login before connecting to SocketIO');
      } else {
        console.warn('DB.autoInit error:', e.message);
      }
    });
  }, 500);

  return {
    init: init,
    put: put,
    get: get,
    del: del,
    list: list,
    map: map,
    unlisten: unlisten,
    startReplication: function () {},
    stopReplication: function () {},
    putAttachment: putAttachment,
    getAttachment: getAttachment,
    listAttachments: listAttachments,
    deleteAttachment: deleteAttachment,
    _internal: {
      get socket() {
        return socket;
      },
      get isConnected() {
        return connected;
      },
    },
  };
})();

window.DB = DB;
