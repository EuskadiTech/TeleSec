var EVENTLISTENER = null;
var EVENTLISTENER2 = null;
var urlParams = new URLSearchParams(location.search);
if (urlParams.get("hidenav") == "yes") {
  document.getElementById("header_hide_query").style.display = "none";
}
var GROUPID = "";
// const PUBLIC_KEY = "~cppGiuA4UFUPGTDoC-4r2izVC3F7MfpaCmF3iZdESN4.vntmjgbAVUpF_zfinYY6EKVFuuTYxh5xOrL4KmtdTmc"
var TABLE = GROUPID + ":telesec.tech.eus";
const RELAYS = [
  "https://gun-es01.tech.eus/gun",
  "https://gun-es02.tech.eus/gun",
  "https://gun-es03.tech.eus/gun",
  "https://gun-es04.tech.eus/gun",
  "https://gun-es05.tech.eus/gun",
  "https://gun-es06.tech.eus/gun",
  // "https://gun-es07.tech.eus/gun", // No he podido instalar el nodo.
  "https://gun-manhattan.herokuapp.com/gun",
  "https://peer.wallie.io/gun",
  "https://gun.defucc.me/gun",
];
var SECRET = "";
