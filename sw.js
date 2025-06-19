var cacheName = 'telesec_2025-06-19_2';

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
        "static/ico/azucar-moreno.png",
        "static/ico/azucar-blanco.jpg",
        "static/ico/stevia.jpg",
        "static/ico/stevia-gotas.webp",
        "static/ico/sacarina.jpg",
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
        "static/ico/statusok.png",
        "static/ico/snowflake.png",
        "static/ico/tea_bag.png",
        "static/ico/thermometer2.png",
        "static/ico/user.png",
        "static/ico/user_generic.png",
        "static/ico/water_tap.png",
        "static/ico/wheat.png",
        "static/ico/layered1/Azucar-Az. Blanco.png",
        "static/ico/layered1/Azucar-Az. Moreno.png",
        "static/ico/layered1/Azucar-Edulcorante.png",
        "static/ico/layered1/Azucar-Sacarina.png",
        "static/ico/layered1/Azucar-Sin.png",
        "static/ico/layered1/Azucar-Stevia (Gotas).png",
        "static/ico/layered1/Azucar-Stevia (Pastillas).png",
        "static/ico/layered1/Background.png",
        "static/ico/layered1/Cafeina-Con.png",
        "static/ico/layered1/Cafeina-Sin.png",
        "static/ico/layered1/Leche-Agua.png",
        "static/ico/layered1/Leche-Sin lactosa.png",
        "static/ico/layered1/Leche-Vegetal.png",
        "static/ico/layered1/Leche-de Vaca.png",
        "static/ico/layered1/Selección-CafeSolo.png",
        "static/ico/layered1/Selección-CaféLeche.png",
        "static/ico/layered1/Selección-ColaCao.png",
        "static/ico/layered1/Selección-Infusion.png",
        "static/ico/layered1/Selección-Leche.png",
        "static/ico/layered1/Tamaño-Grande.png",
        "static/ico/layered1/Tamaño-Pequeño.png",
        "static/ico/layered1/Temperatura-Caliente.png",
        "static/ico/layered1/Temperatura-Frio.png",
        "static/ico/layered1/Temperatura-Templado.png",
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
