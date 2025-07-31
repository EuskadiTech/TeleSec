var cacheName = 'telesec_2025-07-30_4';


self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll(["index.html", "icon512_maskable.png", "icon512_rounded.png", "cola_cao.jpg", "manifest.json", "static/webrtc.js", "static/synchronous.js", "static/sea.js", "static/gun.js", "static/toastr.min.css", "static/store.js", "static/simplemde.min.css", "static/doublescroll.js", "static/rindexed.js", "static/yson.js", "static/toastr.min.js", "static/showdown.min.js", "static/load.js", "static/radix.js", "static/axe.js", "static/TeleSec.jpg", "static/path.js", "static/radisk.js", "static/open.js", "static/simplemde.min.js", "static/jquery.js", "static/euskaditech-css/README.md", "static/euskaditech-css/.gitignore", "static/euskaditech-css/simple.css", "static/euskaditech-css/.git", "static/euskaditech-css/logos/EuskadiTech/long nobg color.svg", "static/euskaditech-css/logos/EuskadiTech/nobg color.png", "static/euskaditech-css/logos/EuskadiTech/nobg color.svg", "static/euskaditech-css/logos/EuskadiTech/long nobg color.png", "static/ico/add.png", "static/ico/user_generic.png", "static/ico/keyboard_key_g.png", "static/ico/keyboard_key_p.png", "static/ico/snowflake.png", "static/ico/coffee_bean.png", "static/ico/arrow_up_red.png", "static/ico/milk (1).png", "static/ico/azucar-moreno.png", "static/ico/arrow_down_blue.png", "static/ico/camera2.png", "static/ico/fire.png", "static/ico/cookies.png", "static/ico/checkbox_unchecked.png", "static/ico/wheat.png", "static/ico/sacarina.jpg", "static/ico/arrow_left_green.png", "static/ico/tea_bag.png", "static/ico/cow.png", "static/ico/connect_ko.svg", "static/ico/milk.png", "static/ico/user.png", "static/ico/stevia.jpg", "static/ico/water_tap.png", "static/ico/thermometer2.png", "static/ico/statusok.png", "static/ico/lollipop.png", "static/ico/colacao.jpg", "static/ico/delete.png", "static/ico/cereales.png", "static/ico/checkbox.png", "static/ico/azucar-blanco.jpg", "static/ico/preferences.png", "static/ico/sizes.png", "static/ico/stevia-gotas.webp", "static/ico/connect_ok.svg", "static/ico/layered1/Azucar-Az. Moreno.png", "static/ico/layered1/Azucar-Stevia (Pastillas).png", "static/ico/layered1/Azucar-Sacarina.png", "static/ico/layered1/Selección-ColaCao.png", "static/ico/layered1/Temperatura-Templado.png", "static/ico/layered1/Tamaño-Pequeño.png", "static/ico/layered1/Leche-Sin lactosa.png", "static/ico/layered1/Cafeina-Sin.png", "static/ico/layered1/Leche-Vegetal.png", "static/ico/layered1/Leche-de Vaca.png", "static/ico/layered1/Selección-Infusion.png", "static/ico/layered1/Azucar-Sin.png", "static/ico/layered1/Selección-Leche.png", "static/ico/layered1/Temperatura-Frio.png", "static/ico/layered1/Background.png", "static/ico/layered1/Azucar-Edulcorante.png", "static/ico/layered1/Cafeina-Con.png", "static/ico/layered1/Selección-CaféLeche.png", "static/ico/layered1/Tamaño-Grande.png", "static/ico/layered1/Selección-CafeSolo.png", "static/ico/layered1/Leche-Agua.png", "static/ico/layered1/Temperatura-Caliente.png", "static/ico/layered1/Azucar-Stevia (Gotas).png", "static/ico/layered1/Azucar-Az. Blanco.png"]))
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
