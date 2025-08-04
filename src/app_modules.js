try {
  navigator.wakeLock.request("screen");
} catch {
  console.log("ScreenLock Failed");
}
const debounce = (callback, wait) => {
  let isLocked = false;
  let lastArgs = null;
  let timeoutId = null;

  return (...args) => {
    if (!isLocked) {
      // First call: run immediately
      callback(...args);
      isLocked = true;

      // Start lock period
      timeoutId = setTimeout(() => {
        isLocked = false;
        if (lastArgs) {
          callback(...lastArgs);
          lastArgs = null;
        }
      }, wait);
    } else {
      // During lock: save latest args
      lastArgs = args;
    }
  };
};

String.prototype.toHex = function () {
  var s = this + "0123456789";
  var colors = [
    "#ff0000",
    "#ff00ff",
    "#00ff00",
    "#0000ff",
    "#00ffff",
    "#000000",
  ];
  var color =
    (((((s.charCodeAt(1) * s.charCodeAt(2)) / s.charCodeAt(s.length - 1)) *
      s.charCodeAt(s.length - 2)) /
      s.charCodeAt(s.length - 2)) *
      s.charCodeAt(s.length - 3)) /
    s.charCodeAt(s.length - 3);
  var cid = colors[Math.round(color) % colors.length];
  console.log(color, cid, colors);
  return cid;
};
function stringToColour(str) {
  return str.toHex();
}
function colorIsDarkAdvanced(bgColor) {
  let color = bgColor.charAt(0) === "#" ? bgColor.substring(1, 7) : bgColor;
  let r = parseInt(color.substring(0, 2), 16); // hexToR
  let g = parseInt(color.substring(2, 4), 16); // hexToG
  let b = parseInt(color.substring(4, 6), 16); // hexToB
  let uicolors = [r / 255, g / 255, b / 255];
  let c = uicolors.map((col) => {
    if (col <= 0.03928) {
      return col / 12.92;
    }
    return Math.pow((col + 0.055) / 1.055, 2.4);
  });
  let L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return L <= 0.179 ? "#FFFFFF" : "#000000";
}
function setLayeredImages(comanda, key) {
  // Base paths for each layer type (adjust paths as needed)
  const basePaths = {
    Selección: "static/ico/layered1/",
    Café: "static/ico/layered1/",
    Endulzante: "static/ico/layered1/",
    Cafeina: "static/ico/layered1/",
    Leche: "static/ico/layered1/",
  };

  // Map for Selección to filenames
  const selectionMap = {
    "ColaCao con leche": "Selección-ColaCao.png",
    Infusión: "Selección-Infusion.png",
    "Café con leche": "Selección-CaféLeche.png",
    "Solo Leche": "Selección-Leche.png",
    "Solo café (sin leche)": "Selección-CaféSolo.png",
  };

  // Start div with relative positioning for layering
  let html = `<div style="position: relative; width: 200px; height: 200px; background: white; display: inline-block; border: 1px dotted black;">`;

  // Layer 1: Selección image
  const selection = comanda["Selección"];
  if (selectionMap[selection]) {
    html += `<img id="img1-${key}" src="${
      basePaths.Selección + selectionMap[selection]
    }" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">`;
  }

  // Layer 2: Café
  if (comanda.Café) {
    html += `<img id="img2-${key}" src="${basePaths.Café}Café-${comanda.Café}.png" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">`;
  }

  // Layer 3: Endulzante
  if (comanda.Endulzante) {
    html += `<img id="img3-${key}" src="${basePaths.Endulzante}Azucar-${comanda.Endulzante}.png" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">`;
  }

  // Layer 4: Cafeina
  if (comanda.Cafeina) {
    html += `<img id="img4-${key}" src="${basePaths.Cafeina}Cafeina-${comanda.Cafeina}.png" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">`;
  }
  // Layer 5: Leche
  if (comanda.Leche) {
    html += `<img id="img5-${key}" src="${basePaths.Leche}Leche-${comanda.Leche}.png" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">`;
  }
  // Layer 6: Temperatura
  if (comanda.Temperatura) {
    html += `<img id="img6-${key}" src="${basePaths.Leche}Temperatura-${comanda.Temperatura}.png" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">`;
  }
  // Layer 7: Tamaño
  if (comanda.Tamaño) {
    html += `<img id="img7-${key}" src="${basePaths.Leche}Tamaño-${comanda.Tamaño}.png" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">`;
  }

  // Close div
  html += "</div>";

  return html;
}
function addCategory(
  parent,
  name,
  icon,
  options,
  values,
  change_cb = () => {}
) {
  var details_0 = document.createElement("details"); // children: img_0, summary_0
  //details_0.open = true;
  var img_0 = document.createElement("img");
  img_0.src = "static/ico/checkbox_unchecked.png";
  img_0.style.height = "30px";
  if (values[name] != undefined) {
    //details_0.open = true;
    img_0.src = "static/ico/checkbox.png";
  }
  var summary_0 = document.createElement("summary");
  var span_0 = document.createElement("span");
  span_0.style.float = "right";
  span_0.append(values[name] || "", " ", img_0);
  summary_0.append(name, span_0);
  details_0.append(summary_0, document.createElement("br"));
  details_0.style.textAlign = "center";
  details_0.style.margin = "5px";
  details_0.style.padding = "5px";
  details_0.style.border = "2px solid black";
  details_0.style.borderRadius = "5px";
  details_0.style.backgroundColor = "white";
  details_0.style.cursor = "pointer";
  details_0.style.width = "calc(100% - 25px)";
  details_0.style.display = "inline-block";
  summary_0.style.padding = "10px";
  // background image at the start of summary_0:
  summary_0.style.backgroundImage = "url('" + icon + "')";
  summary_0.style.backgroundSize = "contain";
  summary_0.style.backgroundPosition = "left";
  summary_0.style.backgroundRepeat = "no-repeat";
  summary_0.style.textAlign = "left";
  summary_0.style.paddingLeft = "55px";
  parent.append(details_0);

  options.forEach((option) => {
    var btn = document.createElement("button");
    var br1 = document.createElement("br");
    //btn.innerText = option.key + ": " + option.value
    btn.append(option.value);
    // for each image in option.img:

    if (option.img) {
      var br2 = document.createElement("br");
      btn.append(br2);
      option.img.forEach((imgsrc) => {
        var img = document.createElement("img");
        img.src = imgsrc;
        img.style.height = "50px";
        img.style.padding = "5px";
        img.style.backgroundColor = "white";
        btn.append(img, " ");
      });
    }
    btn.className = option.className;
    if (values[option.key] == option.value) {
      btn.classList.add("activeSCButton");
    }
    btn.onclick = (event) => {
      var items = details_0.getElementsByClassName("activeSCButton");
      for (var i = 0; i < items.length; i++) {
        items[i].classList.remove("activeSCButton");
      }
      btn.classList.add("activeSCButton");
      values[option.key] = option.value;
      span_0.innerText = option.value;
      change_cb(values);
      img_0.src = "static/ico/checkbox.png";
    };
    btn.style.borderRadius = "20px";
    //btn.style.fontSize="17.5px"
    details_0.append(btn);
  });
}
function addCategory_Personas(
  parent,
  options,
  defaultval,
  change_cb = () => {},
  label = "Persona",
  open_default = false,
  default_empty_text = "- Lista Vacia -"
) {
  var details_0 = document.createElement("details"); // children: img_0, summary_0
  //details_0.open = true;
  var img_0 = document.createElement("img");
  img_0.src = "static/ico/checkbox_unchecked.png";
  img_0.style.height = "30px";
  if (defaultval != "") {
    details_0.open = false;
    img_0.src = "static/ico/checkbox.png";
  }
  var summary_0 = document.createElement("summary");
  var span_0 = document.createElement("span");
  span_0.style.float = "right";
  var p = SC_Personas[defaultval] || {};
  span_0.append(p.Nombre || "", " ", img_0);
  summary_0.append(label, span_0);
  details_0.append(summary_0, document.createElement("br"));
  if (open_default == true) {
    details_0.open = true;
  }
  details_0.style.textAlign = "center";
  details_0.style.margin = "5px";
  details_0.style.padding = "5px";
  details_0.style.border = "2px solid black";
  details_0.style.borderRadius = "5px";
  details_0.style.backgroundColor = "white";
  details_0.style.cursor = "pointer";
  details_0.style.width = "calc(100% - 25px)";
  details_0.style.display = "inline-block";
  summary_0.style.padding = "10px";
  // background image at the start of summary_0:
  summary_0.style.backgroundImage = "url('static/ico/user.png')";
  summary_0.style.backgroundSize = "contain";
  summary_0.style.backgroundPosition = "left";
  summary_0.style.backgroundRepeat = "no-repeat";
  summary_0.style.textAlign = "left";
  summary_0.style.paddingLeft = "55px";
  parent.append(details_0);
  var lastreg = "";
  Object.entries(options)
    .sort(PERSONAS_Sorter)
    .map((entry) => {
      var key = entry[0];
      var value = entry[1];
      if (lastreg != value.Region.toUpperCase()) {
        lastreg = value.Region.toUpperCase();
        var h3_0 = document.createElement("h2");
        h3_0.style.margin = "0";
        h3_0.style.marginTop = "15px";
        h3_0.innerText = lastreg;
        details_0.append(h3_0);
      }
      var option = value.Nombre;
      var btn = document.createElement("button");
      var br1 = document.createElement("br");
      //btn.innerText = option.key + ": " + option.value
      btn.append(option);

      var br2 = document.createElement("br");
      btn.append(br2);
      var img = document.createElement("img");
      img.src = value.Foto;
      img.style.height = "60px";
      img.style.padding = "5px";
      img.style.backgroundColor = "white";
      btn.append(img, " ");

      if (defaultval == key) {
        btn.classList.add("activeSCButton");
      }
      btn.onclick = (event) => {
        var items = details_0.getElementsByClassName("activeSCButton");
        for (var i = 0; i < items.length; i++) {
          items[i].classList.remove("activeSCButton");
        }
        btn.classList.add("activeSCButton");
        defaultval = key;
        span_0.innerText = "";
        var img_5 = document.createElement("img");
        img_5.src = value.Foto;
        img_5.style.height = "30px";
        span_0.append(img_5, value.Nombre);
        change_cb(defaultval);
        img_0.src = "static/ico/checkbox.png";
      };
      btn.style.borderRadius = "20px";
      //btn.style.fontSize="17.5px"
      details_0.append(btn);
    });
  if (Object.entries(options).length == 0) {
    var btn = document.createElement("b");
    btn.append(default_empty_text);
    details_0.append(btn);
  }
}
const SC_actions_icons = {
  Tamaño: "static/ico/sizes.png",
  Temperatura: "static/ico/thermometer2.png",
  Leche: "static/ico/milk.png",
  Selección: "static/ico/preferences.png",
  Cafeina: "static/ico/coffee_bean.png",
  Endulzante: "static/ico/lollipop.png",
  Receta: "static/ico/cookies.png",
};
const SC_actions = {
  Selección: [
    {
      value: "Solo Leche",
      key: "Selección",
      className: "btn4",
      img: ["static/ico/milk.png"],
    },
    {
      value: "Solo café (sin leche)",
      key: "Selección",
      className: "btn4",
      img: ["static/ico/coffee_bean.png"],
    },
    {
      value: "Café con leche",
      key: "Selección",
      className: "btn4",
      img: ["static/ico/coffee_bean.png", "static/ico/milk.png"],
    },
    {
      value: "ColaCao con leche",
      key: "Selección",
      className: "btn4",
      img: ["static/ico/colacao.jpg", "static/ico/milk.png"],
    },
    {
      value: "Leche con cereales",
      key: "Selección",
      className: "btn4",
      img: ["static/ico/cereales.png", "static/ico/milk.png"],
    },
    {
      value: "Infusión",
      key: "Selección",
      className: "btn4",
      img: ["static/ico/tea_bag.png"],
    },
  ],
  Tamaño: [
    {
      value: "Grande",
      key: "Tamaño",
      className: "btn1",
      img: ["static/ico/keyboard_key_g.png"],
    },
    {
      value: "Pequeño",
      key: "Tamaño",
      className: "btn1",
      img: ["static/ico/keyboard_key_p.png"],
    },
  ],
  Temperatura: [
    {
      value: "Caliente",
      key: "Temperatura",
      className: "btn2",
      img: [
        "static/ico/thermometer2.png",
        "static/ico/arrow_up_red.png",
        "static/ico/fire.png",
      ],
    },
    {
      value: "Templado",
      key: "Temperatura",
      className: "btn2",
      img: ["static/ico/thermometer2.png", "static/ico/arrow_left_green.png"],
    },
    {
      value: "Frio",
      key: "Temperatura",
      className: "btn2",
      img: [
        "static/ico/thermometer2.png",
        "static/ico/arrow_down_blue.png",
        "static/ico/snowflake.png",
      ],
    },
  ],
  Leche: [
    {
      value: "de Vaca",
      key: "Leche",
      className: "btn3",
      img: ["static/ico/cow.png", "static/ico/add.png"],
    },
    {
      value: "Sin lactosa",
      key: "Leche",
      className: "btn3",
      img: ["static/ico/cow.png", "static/ico/delete.png"],
    },
    {
      value: "Vegetal",
      key: "Leche",
      className: "btn3",
      img: ["static/ico/milk.png", "static/ico/wheat.png"],
    },
    {
      value: "Agua",
      key: "Leche",
      className: "btn3",
      img: ["static/ico/water_tap.png"],
    },
  ],
  Cafeina: [
    {
      value: "Con",
      key: "Cafeina",
      className: "btn5",
      img: ["static/ico/coffee_bean.png", "static/ico/add.png"],
    },
    {
      value: "Sin",
      key: "Cafeina",
      className: "btn5",
      img: ["static/ico/coffee_bean.png", "static/ico/delete.png"],
    },
  ],
  Endulzante: [
    {
      value: "Az. Blanco",
      key: "Endulzante",
      className: "btn6",
      img: ["static/ico/azucar-blanco.jpg"],
    },
    {
      value: "Az. Moreno",
      key: "Endulzante",
      className: "btn6",
      img: ["static/ico/azucar-moreno.png"],
    },
    {
      value: "Sacarina",
      key: "Endulzante",
      className: "btn6",
      img: ["static/ico/sacarina.jpg"],
    },
    {
      value: "Stevia (Pastillas)",
      key: "Endulzante",
      className: "btn6",
      img: ["static/ico/stevia.jpg"],
    },
    {
      value: "Stevia (Gotas)",
      key: "Endulzante",
      className: "btn6",
      img: ["static/ico/stevia-gotas.webp"],
    },
    {
      value: "Sin",
      key: "Endulzante",
      className: "btn6",
      img: ["static/ico/delete.png"],
    },
  ],
  Receta: [
    {
      value: "Si",
      key: "Receta",
      className: "btn7",
      img: ["static/ico/add.png"],
    },
    {
      value: "No",
      key: "Receta",
      className: "btn7",
      img: ["static/ico/delete.png"],
    },
  ],
};
var SC_Personas = {};
// Listado precargado de personas:
gun
  .get(TABLE)
  .get("personas")
  .map()
  .on((data, key, _msg, _ev) => {
    function add_row(data, key) {
      if (data != null) {
        data["_key"] = key;
        SC_Personas[key] = data;
      } else {
        delete SC_Personas[key];
      }
    }
    if (typeof data == "string") {
      SEA.decrypt(data, SECRET, (data) => {
        add_row(data, key);
      });
    } else {
      add_row(data, key);
    }
  });

function SC_parse(json) {
  var out = "";
  Object.entries(json).forEach((entry) => {
    out += entry[0] + ": " + entry[1] + "\n";
  });
  return out;
}
function SC_parse_short(json) {
  var valores = "<small style='font-size: 60%;'>Servicio base (10c)</small>\n";

  Object.entries(json).forEach((entry) => {
    valores +=
      "<small style='font-size: 60%;'>" +
      entry[0] +
      ":</small> " +
      entry[1] +
      " ";
    var combo = entry[0] + ";" + entry[1];
    switch (entry[0]) {
      case "Leche":
        // Leche pequeña = 10c
        if (
          json["Tamaño"] == "Pequeño" &&
          ["de Vaca", "Sin lactosa", "Vegetal"].includes(json["Leche"])
        ) {
          valores += "<small>(P = 10c)</small>";
        }
        // Leche grande = 20c
        if (
          json["Tamaño"] == "Grande" &&
          ["de Vaca", "Sin lactosa", "Vegetal"].includes(json["Leche"])
        ) {
          valores += "<small>(G = 20c)</small>";
        }
        break;
      case "Selección":
        // Café = 20c
        if (
          ["Café con leche", "Solo café (sin leche)"].includes(
            json["Selección"]
          )
        ) {
          valores += "<small>(20c)</small>";
        }
        // ColaCao = 20c
        if (json["Selección"] == "ColaCao con leche") {
          valores += "<small>(20c)</small>";
        }
      default:
        break;
    }

    valores += "\n";
  });
  return valores;
}
function SC_priceCalc(json) {
  var precio = 0;
  var valores = "";
  // Servicio base = 10c
  precio += 10;
  valores += "Servicio base = 10c\n";
  // Leche pequeña = 10c
  if (
    json["Tamaño"] == "Pequeño" &&
    ["de Vaca", "Sin lactosa", "Vegetal"].includes(json["Leche"])
  ) {
    precio += 10;
    valores += "Leche pequeña = 10c\n";
  }
  // Leche grande = 20c
  if (
    json["Tamaño"] == "Grande" &&
    ["de Vaca", "Sin lactosa", "Vegetal"].includes(json["Leche"])
  ) {
    precio += 20;
    valores += "Leche grande = 20c\n";
  }
  // Café = 20c
  if (["Café con leche", "Solo café (sin leche)"].includes(json["Selección"])) {
    precio += 20;
    valores += "Café = 20c\n";
  }
  // ColaCao = 20c
  if (json["Selección"] == "ColaCao con leche") {
    precio += 20;
    valores += "ColaCao = 20c\n";
  }
  valores += "<hr>Total: " + precio + "c\n";
  return [precio, valores];
}
function PERSONAS_Sorter(a, b) {
  if (a[1].Region < b[1].Region) {
    return -1;
  }
  if (a[1].Region > b[1].Region) {
    return 1;
  }
  return 0;
}

function TS_IndexElement(
  pageco,
  config,
  ref,
  container,
  rowCallback = undefined,
  canAddCallback = undefined,
  globalSearchBar = true
) {
  // Every item in config should have:
  // key: string
  // type: string
  // default: string
  // label: string
  var tablebody = safeuuid();
  var tablehead = safeuuid();
  var scrolltable = safeuuid();
  var searchKeyInput = safeuuid();

  // Create the container with search bar and table
  container.innerHTML = `
    <div id="${scrolltable}">
      <table>
        <thead>
          <tr style="background: transparent;">
            <th colspan="100%" style="padding: 0; background: transparent;">
              <input type="text" id="${searchKeyInput}" placeholder="🔍 Buscar..." style="width: calc(100% - 18px); padding: 8px; border: 1px solid #ccc; border-radius: 4px; background-color: rebeccapurple; color: white;">
            </th>
          </tr>
          <tr id="${tablehead}"></tr>
        </thead>
        <tbody id="${tablebody}">
        </tbody>
      </table>
    </div>
          `;
  tableScroll("#" + scrolltable); // id="scrolltable"
  var tablehead_EL = document.getElementById(tablehead);
  var tablebody_EL = document.getElementById(tablebody);
  var rows = {};
  config.forEach((key) => {
    tablehead_EL.innerHTML += `<th>${key.label}</th>`;
  });
  // Add search functionality
  const searchKeyEl = document.getElementById(searchKeyInput);
  searchKeyEl.addEventListener(
    "input",
    debounce(() => render(), 300)
  );

  function searchInData(data, searchValue, config) {
    if (!searchValue) return true;

    // Search in ID
    if (data._key.toLowerCase().includes(searchValue)) return true;

    // Search in configured fields
    for (const field of config) {
      const value = data[field.key];
      if (!value) continue;

      // Handle different field types
      switch (field.type) {
        case "comanda":
          try {
            const comandaData = JSON.parse(data.Comanda);
            // Search in all comanda fields
            if (
              Object.values(comandaData).some((v) =>
                String(v).toLowerCase().includes(searchValue)
              )
            )
              return true;
          } catch (e) {
            // If JSON parse fails, search in raw string
            if (data.Comanda.toLowerCase().includes(searchValue)) return true;
          }
          break;
        case "persona":
          const persona = SC_Personas[value];
          if (persona) {
            // Search in persona fields
            if (persona.Nombre?.toLowerCase().includes(searchValue))
              return true;
            if (persona.Region?.toLowerCase().includes(searchValue))
              return true;
          }
          break;
        default:
          // For raw and other types, search in the direct value
          if (String(value).toLowerCase().includes(searchValue)) return true;
      }
    }
    return false;
  }

  function render() {
    function sorter(a, b) {
      if (a.Fecha < b.Fecha) {
        return -1;
      }
      if (a.Fecha > b.Fecha) {
        return 1;
      }
      return 0;
    }

    const searchValue = searchKeyEl.value.toLowerCase().trim();
    tablebody_EL.innerHTML = "";
    Object.entries(rows)
      .filter(([_, data]) => searchInData(data, searchValue, config))
      .map(([_, data]) => data)
      .sort(sorter)
      .forEach((data) => {
        var new_tr = document.createElement("tr");

        if (canAddCallback != undefined) {
          if (canAddCallback(data) == true) {
            return;
          }
        }
        tablebody_EL.append(new_tr);
        if (rowCallback != undefined) {
          rowCallback(data, new_tr);
        }
        config.forEach((key) => {
          switch (key.type) {
            case "raw":
              const tdRaw = document.createElement("td");
              const rawContent = (data[key.key] || key.default || "").replace(
                /\n/g,
                "<br>"
              );
              tdRaw.innerHTML = rawContent;
              new_tr.appendChild(tdRaw);
              break;
            case "comanda":
              const tdComanda = document.createElement("td");
              tdComanda.style.verticalAlign = "top";
              const parsedComanda = JSON.parse(data.Comanda);
              const precio = SC_priceCalc(parsedComanda)[0];

              // Create a temporary div to parse the HTML from setLayeredImages
              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = setLayeredImages(parsedComanda, data._key);
              tdComanda.appendChild(tempDiv.firstChild);

              const pre = document.createElement("pre");
              pre.style.fontSize = "15px";
              pre.style.display = "inline-block";
              pre.style.margin = "0";
              pre.style.verticalAlign = "top";
              pre.style.padding = "5px";
              //looking like a post-it
              pre.style.background = "rgba(255, 255, 0, 0.5)";
              pre.style.border = "1px solid rgba(0, 0, 0, 0.2)";
              pre.style.borderRadius = "5px";
              pre.style.boxShadow = "2px 2px 5px rgba(0, 0, 0, 0.1)";
              pre.style.height = "100%";
              const spanPrecio = document.createElement("span");
              spanPrecio.style.fontSize = "20px";
              spanPrecio.innerHTML =
                SC_Personas[data.Persona].Puntos >= 10
                  ? `Total: Gratis!(${precio}c)`
                  : `Total: ${precio}c`;
              pre.innerHTML = "<b>Ticket de compra</b> ";
              pre.appendChild(document.createTextNode("\n"));
              pre.innerHTML +=
                SC_parse_short(parsedComanda) + "<hr>" + data.Notas + "<hr>";
              pre.appendChild(spanPrecio);

              tdComanda.appendChild(pre);
              new_tr.appendChild(tdComanda);
              break;
            case "comanda-status":
              var sc_nobtn = "";
              if (urlParams.get("sc_nobtn") == "yes") {
                sc_nobtn = "pointer-events: none; opacity: 0.5";
              }
              const td = document.createElement("td");
              td.style.fontSize = "17px";
              if (sc_nobtn) {
                td.style.pointerEvents = "none";
                td.style.opacity = "0.5";
              }

              // Create buttons
              const createButton = (text, state) => {
                const button = document.createElement("button");
                button.textContent = text;
                if (data.Estado === state) {
                  button.className = "rojo";
                }
                button.onclick = (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  data.Estado = state;
                  var enc = SEA.encrypt(data, SECRET, (encrypted) => {
                    betterGunPut(ref.get(data._key), encrypted);
                    toastr.success("Guardado!");
                  });
                  return false;
                };
                return button;
              };

              // Create all buttons
              const buttons = [
                createButton("Pedido", "Pedido"),
                createButton("En preparación", "En preparación"),
                createButton("Listo", "Listo"),
                createButton("Entregado", "Entregado"),
                createButton("Deuda", "Deuda"),
              ];

              // Create paid button separately due to different behavior
              const paidButton = document.createElement("button");
              paidButton.textContent = "Pagado";
              paidButton.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (
                  !confirm(
                    "¿Quieres marcar como pagado? - Se borrara la comanda y se actualizarán los puntos."
                  )
                ) {
                  return false;
                }
                data.Estado = "Pagado";
                betterGunPut(ref.get(data._key), null);
                toastr.success("Guardado!");
                if (SC_Personas[data.Persona].Puntos >= 10) {
                  SC_Personas[data.Persona].Puntos -= 10;
                  toastr.success(
                    "¡Comada gratis para " +
                      SC_Personas[data.Persona].Nombre +
                      "!"
                  );
                  toastr.success(
                    "¡Comada gratis para " +
                      SC_Personas[data.Persona].Nombre +
                      "!"
                  );
                } else {
                  SC_Personas[data.Persona].Puntos += 1;
                  toastr.success("¡Comada DE PAGO!");
                }
                SEA.encrypt(SC_Personas[data.Persona], SECRET, (encrypted) => {
                  betterGunPut(
                    gun.get(TABLE).get("personas").get(data.Persona),
                    encrypted
                  );
                });
                return false;
              };

              // Add all buttons to td with line breaks between
              buttons.forEach((button) => {
                td.appendChild(button);
                td.appendChild(document.createElement("br"));
              });
              td.appendChild(paidButton);
              new_tr.appendChild(td);

              // Event handlers are now attached during button creation
              break;
            case "persona":
              const persona = SC_Personas[data[key.key]];
              const regco = stringToColour(
                (persona.Region || "?").toLowerCase()
              );

              const tdPersona = document.createElement("td");
              tdPersona.style.textAlign = "center";
              tdPersona.style.fontSize = "20px";
              tdPersona.style.backgroundColor = regco;
              tdPersona.style.color = colorIsDarkAdvanced(regco);

              const regionSpan = document.createElement("span");
              regionSpan.style.fontSize = "40px";
              regionSpan.style.textTransform = "capitalize";
              regionSpan.textContent = (persona.Region || "?").toLowerCase();
              tdPersona.appendChild(regionSpan);

              tdPersona.appendChild(document.createElement("br"));

              const infoSpan = document.createElement("span");
              infoSpan.style.backgroundColor = "white";
              infoSpan.style.border = "2px solid black";
              infoSpan.style.borderRadius = "5px";
              infoSpan.style.display = "inline-block";
              infoSpan.style.padding = "5px";
              infoSpan.style.color = "black";

              const img = document.createElement("img");
              img.src = persona.Foto || "static/ico/user_generic.png";
              img.height = 70;
              infoSpan.appendChild(img);

              infoSpan.appendChild(document.createElement("br"));
              infoSpan.appendChild(
                document.createTextNode(persona.Nombre || "")
              );

              infoSpan.appendChild(document.createElement("br"));
              const pointsSpan = document.createElement("span");
              pointsSpan.style.fontSize = "17px";
              pointsSpan.textContent = (persona.Puntos || "0") + " puntos.";
              infoSpan.appendChild(pointsSpan);

              tdPersona.appendChild(infoSpan);
              new_tr.appendChild(tdPersona);
              break;

            default:
              break;
          }
        });
        new_tr.onclick = (event) => {
          setUrlHash(pageco + "," + data._key);
        };
      });
  }
  ref.map().on((data, key, _msg, _ev) => {
    EVENTLISTENER = _ev;
    function add_row(data, key) {
      if (data != null) {
        data["_key"] = key;
        rows[key] = data;
      } else {
        delete rows[key];
      }
      render();
    }
    if (typeof data == "string") {
      SEA.decrypt(data, SECRET, (data) => {
        add_row(data, key);
      });
    } else {
      add_row(data, key);
    }
  });
}

const PAGES = {};
function SetPages() {
  Object.keys(PAGES).forEach((key) => {
    if (PAGES[key].Esconder == true) {
      return;
    }
    var a = document.createElement("a");
    a.className = "button " + PAGES[key].navcss;
    a.href = "#" + key;
    a.innerText = PAGES[key].Title;
    document.getElementById("appendApps").append(a);
  });
}
document.addEventListener("DOMContentLoaded", () => {
  SetPages();
  document.getElementById("appendApps").style.display = "none";
});
var Booted = false;
getPeers();
setInterval(() => {
  getPeers();
  if (ConnectionStarted && !Booted) {
    Booted = true;
    document.getElementById("loading").style.display = "none";
    if (!SUB_LOGGED_IN) {
      open_page("login");
      return;
    }
    document.getElementById("appendApps").style.display = "block";
    open_page(location.hash.replace("#", ""));
  }
}, 1500);
