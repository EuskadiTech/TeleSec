function tableScroll(query) {
  $(query).doubleScroll();
}
//var secretTokenEl = document.getElementById("secretToken");
var groupIdEl = document.getElementById("LinkAccount_group");
var container = document.getElementById("container");

function LinkAccount(LinkAccount_group, LinkAccount_secret, refresh = false) {
  GROUPID = LinkAccount_group.toUpperCase();
  SECRET = LinkAccount_secret.toUpperCase();
  
  localStorage.setItem("TELESEC_AUTO", "YES");
  localStorage.setItem("TELESEC_groupid", GROUPID);
  localStorage.setItem("TELESEC_secret", SECRET);
  
  TABLE = GROUPID + ":telesec.tech.eus";
  //secretTokenEl.innerText = SECRET;
  groupIdEl.value = GROUPID;
  if (refresh == true) {
    location.reload();
  }
}
if (localStorage.getItem("TELESEC_AUTO") == "YES") {
  LinkAccount(
    localStorage.getItem("TELESEC_groupid"),
    localStorage.getItem("TELESEC_secret")
  );
}
if (urlParams.get("login") != null) {
  LinkAccount(
    urlParams.get("login").split(":")[0],
    urlParams.get("login").split(":")[1]
  );
  //location.search = "";
}

function open_page(params) {
  EventListenrea.GunJS.forEach(ev => ev.off());
  EventListenrea.Timeout.forEach(ev => clearTimeout(ev));
  EventListenrea.Interval.forEach(ev => clearInterval(ev));
  if (SUB_LOGGED_IN != true) {
    PAGES["login"].index();
    return;
  }
  if (params == "") {
    params = "index";
  }
  var path = params.split(",");
  var app = path[0];
  if (path[1] == undefined) {
    PAGES[app].index();
    return;
  }
  PAGES[app].edit(path[1]);
}

function setUrlHash(hash) {
  location.hash = "#" + hash;
  
  
}
window.onhashchange = () => {
  open_page(location.hash.replace("#", ""));
};

function download(filename, text) {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:application/octet-stream;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);
  
  element.style.display = "none";
  document.body.appendChild(element);
  
  element.click();
  
  document.body.removeChild(element);
}

function resizeInputImage(
  file,
  callback,
  targetHeight = 256,
  targetQuality = 0.75
) {
  const reader = new FileReader();
  
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      const aspectRatio = img.width / img.height;
      const targetWidth = targetHeight * aspectRatio;
      
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      const ctx = canvas.getContext("2d");
      
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      
      // Get resized image as Blob
      const dataURL = canvas.toDataURL("image/jpeg", targetQuality);
      callback(dataURL);
    };
    img.src = event.target.result;
  };
  
  reader.readAsDataURL(file);
}

function CurrentISODate() {
  return new Date().toISOString().split("T")[0].replace("T", " ");
}

function CurrentISOTime() {
  return new Date().toISOString();
}

function fixGunLocalStorage() {
  localStorage.removeItem("radata");
  removeCache();
  location.reload();
}

function betterGunPut(ref, data) {
  ref.put(data, (ack) => {
    if (ack.err) {
      toastr.error(
        ack.err + "<br>Pulsa aqui para reiniciar la app",
        "Error al guardar", { onclick: () => fixGunLocalStorage() }
      );
    } else {
      console.debug("Guardado correctamente");
    }
  });
  setTimeout(() => {
    ref.put(data);
  }, 250);
  setTimeout(() => {
    ref.put(data);
  }, 500);
}
setInterval(() => {
  betterGunPut(
    gun.get(TABLE).get("heartbeat"),
    "heartbeat-" + CurrentISOTime()
  );
  gun.get(TABLE).get("heartbeat").load(console.debug);
}, 5000);
gun.get(TABLE).on((data) => {
  var e = true;
});