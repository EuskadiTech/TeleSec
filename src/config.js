var EventListeners = {
  GunJS: [],
  Timeout: [],
  Interval: [],
  QRScanner: [],
  Custom: [],
};

function safeuuid(prefix = "AXLUID_") {
  return prefix + crypto.randomUUID().split("-")[4];
}
var urlParams = new URLSearchParams(location.search);
var AC_BYPASS = false;
if (urlParams.get("ac_bypass") == "yes") {
  AC_BYPASS = true;
}
if (urlParams.get("hidenav") != undefined) {
  document.getElementById("header_hide_query").style.display = "none";
}
// getDBName: prefer explicit CouchDB dbname from settings. Single-group model: default to 'telesec'
function getDBName() {
  const dbname = localStorage.getItem('TELESEC_COUCH_DBNAME') || '';
  if (dbname && dbname.trim() !== '') return dbname.trim();
  return 'telesec';
}
// const PUBLIC_KEY = "~cppGiuA4UFUPGTDoC-4r2izVC3F7MfpaCmF3iZdESN4.vntmjgbAVUpF_zfinYY6EKVFuuTYxh5xOrL4KmtdTmc"
// `TABLE` variable removed. The CouchDB database name should be configured via the login/setup form
// and passed to `DB.init({ dbname: '<your-db>' })` so it becomes the app's primary DB.
// Legacy relay list removed (migrated to CouchDB/PouchDB)
const RELAYS = [];
var SECRET = "";
var SUB_LOGGED_IN = false;
var SUB_LOGGED_IN_DETAILS = false;
var SUB_LOGGED_IN_ID = false;
var SAVE_WAIT = 500;
var SC_Personas = {};
var PeerConnectionInterval = 5000;
if (urlParams.get("sublogin") != null) {
  SUB_LOGGED_IN = true;
  SUB_LOGGED_IN_ID = urlParams.get("sublogin");
  SUB_LOGGED_IN_DETAILS = SC_Personas[SUB_LOGGED_IN_ID];
  var sli = 15;
  var slii = setInterval(() => {
    SUB_LOGGED_IN_DETAILS = SC_Personas[SUB_LOGGED_IN_ID];
    sli-=1;
    if (sli < 0) {
      clearInterval(slii);
    }
  }, 500);
}
function LogOutTeleSec() {
  SUB_LOGGED_IN = false;
  SUB_LOGGED_IN_DETAILS = false;
  SUB_LOGGED_IN_ID = false;
  document.getElementById("loading").style.display = "block";
  //Remove sublogin from URL and reload
  urlParams.delete("sublogin");
  history.replaceState(null, "", "?" + urlParams.toString());
  location.reload();
}
