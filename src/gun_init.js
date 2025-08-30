window.rtcRoom = "telesec.tech.eus";
var opt = {
  axe: true,
  localStorage: false,
  peers: RELAYS
  // radisk: true,
};

opt.store = RindexedDB(opt);

var gun = Gun(opt);
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
var AtLeastThreePeers = false;
var ConnectionStarted = false;
function formatPeerInfo(peer) {
  const wireType = peer.wire.constructor.name;
  let wireHType = wireType;
  let wireID = peer.id;

  switch (wireType) {
    case "WebSocket":
      wireHType = "Web";
      wireID = wireID.split("/")[2];
      break;
    case "RTCDataChannel":
      wireHType = "Mesh";
      break;
  }

  return { wireHType, wireID };
}

function isPeerConnected(peer) {
  return peer.wire != undefined && 
         (peer.wire.readyState == 1 || peer.wire.readyState == "open");
}

function createPeerListElement(wireHType, wireID) {
  const el = document.createElement("li");
  el.innerText = `Nodo ${wireHType}: ${wireID}`;
  return el;
}

function updateConnectionStatus(peerCount) {
  const statusImage = peerCount < 3 ? "connect_ko.svg" : "connect_ok.svg";
  if (window.navigator.onLine == false) {
    statusImage = "offline.svg"
  }
  document.getElementById("connectStatus").src = `static/ico/${statusImage}`;
  
  if (peerCount < 3) {
    if (!window.peerRetryCount) window.peerRetryCount = 0;
    window.peerRetryCount = (window.peerRetryCount + 1) % 3;
    if (window.peerRetryCount === 0) {
      gun.opt({ peers: RELAYS });
    }
    AtLeastThreePeers = false;
  } else {
    ConnectionStarted = true;
    AtLeastThreePeers = true;
  }
}

function getPeers() {
  const peerCountEl = document.getElementById("peerCount");
  const peerListEl = document.getElementById("peerList");
  const list = document.createElement("ul");
  
  document.getElementById("peerPID").innerText = "PID " + gun.back("opt.pid");
  
  const connectedPeers = Object.values(gun.back("opt.peers"))
    .filter(isPeerConnected)
    .map(peer => {
      const { wireHType, wireID } = formatPeerInfo(peer);
      return createPeerListElement(wireHType, wireID);
    });
    
  connectedPeers.forEach(el => list.append(el));
  
  peerListEl.innerHTML = list.innerHTML;
  const peerCount = connectedPeers.length;
  peerCountEl.innerText = peerCount;
  
  updateConnectionStatus(peerCount);
}
function safeuuid(prefix = "AXLUID_") {
  return prefix + crypto.randomUUID().split("-")[4];
}
