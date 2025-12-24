function TS_decrypt(input, secret, callback, table, id) {
  // Accept objects or plaintext strings. Also support legacy RSA{...} AES-encrypted entries.
  var __ts_sync = true;
  if (typeof input !== "string") {
    try {
      callback(input, false);
    } catch (e) {
      console.error(e);
    }
    return __ts_sync;
  }

  // Legacy encrypted format: RSA{...}
  if (
    input.startsWith("RSA{") &&
    input.endsWith("}") &&
    typeof CryptoJS !== "undefined"
  ) {
    try {
      var data = input.slice(4, -1);
      var words = CryptoJS.AES.decrypt(data, secret);
      var decryptedUtf8 = null;
      try {
        decryptedUtf8 = words.toString(CryptoJS.enc.Utf8);
      } catch (utfErr) {
        // Malformed UTF-8 — try Latin1 fallback
        try {
          decryptedUtf8 = words.toString(CryptoJS.enc.Latin1);
        } catch (latinErr) {
          console.warn(
            "TS_decrypt: failed to decode decrypted bytes",
            utfErr,
            latinErr
          );
          try {
            callback(input, false);
          } catch (ee) {}
          return;
        }
      }
      var parsed = null;
      try {
        parsed = JSON.parse(decryptedUtf8);
      } catch (pe) {
        // If JSON parsing fails, the decrypted string may be raw Latin1 bytes.
        // Try to convert Latin1 byte string -> UTF-8 and parse again.
        try {
          if (
            typeof TextDecoder !== "undefined" &&
            typeof decryptedUtf8 === "string"
          ) {
            var bytes = new Uint8Array(decryptedUtf8.length);
            for (var _i = 0; _i < decryptedUtf8.length; _i++)
              bytes[_i] = decryptedUtf8.charCodeAt(_i) & 0xff;
            var converted = new TextDecoder("utf-8").decode(bytes);
            try {
              parsed = JSON.parse(converted);
              decryptedUtf8 = converted;
            } catch (e2) {
              parsed = decryptedUtf8;
            }
          } else {
            parsed = decryptedUtf8;
          }
        } catch (convErr) {
          parsed = decryptedUtf8;
        }
      }
      try {
        callback(parsed, true);
      } catch (e) {
        console.error(e);
      }
      // Migrate to plaintext in DB if table/id provided
      if (table && id && window.DB && DB.put && typeof parsed !== "string") {
        DB.put(table, id, parsed).catch(() => {});
      }
      return;
    } catch (e) {
      console.error("TS_decrypt: invalid encrypted payload", e);
      try {
        callback(input, false);
      } catch (ee) {}
      return;
    }
  }
  if (input.startsWith("SEA{") && input.endsWith("}")) {
    __ts_sync = false;
    SEA.decrypt(input, secret, (decrypted) => {
      try {
        callback(decrypted, true);
      } catch (e) {
        console.error(e);
      }
    });
    return __ts_sync;
  }

  // Try to parse JSON strings and migrate to object
  try {
    var parsed = JSON.parse(input);
    try {
      callback(parsed, false);
    } catch (e) {
      console.error(e);
    }
    if (table && id && window.DB && DB.put) {
      DB.put(table, id, parsed).catch(() => {});
    }
  } catch (e) {
    // Not JSON, return raw string
    try {
      callback(input, false);
    } catch (err) {
      console.error(err);
    }
  }
  return __ts_sync;
}

function recursiveTSDecrypt(input, secret = "") {
    // Skip null values (do not show on decrypted output)
    if (input === null) return null;
  if (typeof input === "string") {
    let result = null;
    let resolver = null;
    const promise = new Promise((resolve) => {
      resolver = resolve;
    });
    const sync = TS_decrypt(input, secret, (decrypted) => {
      result = decrypted;
      if (resolver) resolver(decrypted);
    });
    if (sync === false) return promise;
    return result;
  } else if (Array.isArray(input)) {
    const mapped = input.map((item) => recursiveTSDecrypt(item, secret));
    if (mapped.some((v) => v && typeof v.then === "function")) {
      return Promise.all(mapped).then((values) => values.filter((v) => v !== null && typeof v !== 'undefined'));
    }
    return mapped.filter((v) => v !== null && typeof v !== 'undefined');
  } else if (typeof input === "object" && input !== null) {
    const keys = Object.keys(input);
    const mapped = keys.map((k) => recursiveTSDecrypt(input[k], secret));
    if (mapped.some((v) => v && typeof v.then === "function")) {
      return Promise.all(mapped).then((values) => {
        const out = {};
        for (let i = 0; i < keys.length; i++) {
          const val = values[i];
          if (val !== null && typeof val !== 'undefined') out[keys[i]] = val;
        }
        return out;
      });
    } else {
      const out = {};
      for (let i = 0; i < keys.length; i++) {
        const val = mapped[i];
        if (val !== null && typeof val !== 'undefined') out[keys[i]] = val;
      }
      return out;
    }
  } else {
    return input;
  }
}

gun.get(TABLE).load((DATA) => {
  var plain2 = recursiveTSDecrypt(DATA, SECRET);
  plain2.then(function (result) {
    download(
      `Export TeleSec ${GROUPID} Decrypted.json.txt`,
      JSON.stringify(result)
    );
  });
});
