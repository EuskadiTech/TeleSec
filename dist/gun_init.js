window.rtcRoom = "telesec.tech.eus";
var gun = Gun(RELAYS, {
  axe: false,
  localStorage: true,
  // radisk: true,
});
var SEA = Gun.SEA;
var user = gun.user();
function removeCache() {
  caches.keys().then(function (names) {
    for (let name of names) caches.delete(name);
    console.log("Removing cache " + name);
    console.log("OK");
    location.reload(true);
  });
}
function getPeers() {
  var peerCount = 0;
  var peerCountEl = document.getElementById("peerCount");
  var peerListEl = document.getElementById("peerList");
  var list = document.createElement("ul");
  document.getElementById("peerPID").innerText = "PID " + gun.back("opt.pid");
  Object.values(gun.back("opt.peers")).forEach((peer) => {
    if (
      peer.wire != undefined &&
      (peer.wire.readyState == 1 || peer.wire.readyState == "open")
    ) {
      peerCount += 1;
      var wireType = peer.wire.constructor.name;
      var wireHType = peer.wire.constructor.name;
      var wireID = peer.id;
      switch (wireType) {
        case "WebSocket":
          wireHType = "Web";
          wireID = wireID.split("/")[2];
          break;
        case "RTCDataChannel":
          wireHType = "Mesh";
          wireID = peer.id;
      }
      var el = document.createElement("li");
      el.innerText = `Nodo ${wireHType}: ${wireID}`;
      list.append(el);
    }
  });
  peerListEl.innerHTML = list.innerHTML;
  peerCountEl.innerText = peerCount;
  if (peerCount < 3) {
    document.getElementById("connectStatus").src = "static/ico/connect_ko.svg";
    gun.opt({ peers: RELAYS });
  } else {
    document.getElementById("connectStatus").src = "static/ico/connect_ok.svg";
  }
}
getPeers();
setInterval(() => {
  getPeers();
}, 2500);
function safeuuid(prefix = "AXLUID_") {
  return prefix + crypto.randomUUID().split("-")[4];
}
