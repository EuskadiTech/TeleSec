// RxDB bundle entry-point for TeleSec.
// Built by esbuild into dist/static/rxdb.js with the global name 'RxDB'.
// All required RxDB exports are re-exported so they are accessible as
// window.RxDB.createRxDatabase, window.RxDB.getRxStorageDexie, etc.

export { createRxDatabase, addRxPlugin } from "rxdb";
export { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
export { replicateRxCollection } from "rxdb/plugins/replication";
