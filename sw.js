var cacheName = 'telesec_2025-05-29_10';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll([
        "icon512_maskable.png",
        "icon512_rounded.png",
        "index.html",
        "manifest.json",
        "static/axe.js",
        "static/doublescroll.js",
        "static/gun.js",
        "static/jquery.js",
        "static/load.js",
        "static/open.js",
        "static/path.js",
        "static/radisk.js",
        "static/radix.js",
        "static/rindexed.js",
        "static/sea.js",
        "static/showdown.min.js",
        "static/simplemde.min.css",
        "static/simplemde.min.js",
        "static/store.js",
        "static/synchronous.js",
        "static/TeleSec.jpg",
        "static/toastr.min.css",
        "static/toastr.min.js",
        "static/webrtc.js",
        "static/yson.js",
        "static/ico/add.png",
        "static/ico/arrow_down_blue.png",
        "static/ico/arrow_left_green.png",
        "static/ico/arrow_up_red.png",
        "static/ico/camera2.png",
        "static/ico/cereales.png",
        "static/ico/checkbox.png",
        "static/ico/checkbox_unchecked.png",
        "static/ico/connect_ok.svg",
        "static/ico/connect_ko.svg",
        "static/ico/coffee_bean.png",
        "static/ico/colacao.jpg",
        "static/ico/cookies.png",
        "static/ico/cow.png",
        "static/ico/delete.png",
        "static/ico/fire.png",
        "static/ico/keyboard_key_g.png",
        "static/ico/keyboard_key_p.png",
        "static/ico/lollipop.png",
        "static/ico/milk.png",
        "static/ico/preferences.png",
        "static/ico/sizes.png",
        "static/ico/snowflake.png",
        "static/ico/tea_bag.png",
        "static/ico/thermometer2.png",
        "static/ico/user.png",
        "static/ico/user_generic.png",
        "static/ico/water_tap.png",
        "static/ico/wheat.png",
      ]))
  );
});

self.addEventListener('message', function (event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request)
      .then(function (response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
