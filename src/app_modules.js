try {
  navigator.wakeLock.request("screen");
} catch {
  console.log("ScreenLock Failed");
}
const debounce = (id, callback, wait, args) => {
  // debounce with trailing callback
  // First call runs immediately, then locks for 'wait' ms
  // If called during lock, saves the latest args and runs once after lock
  // If not called during lock, does nothing
  if (!debounce.timers) {
    debounce.timers = {};
    debounce.args = {};
  }
  if (!debounce.timers[id]) {
    // No lock, run immediately
    debounce.args[id] = Array.isArray(args) ? args : [args];
    // Spread syntax requires ...iterable[Symbol.iterator] to be a function
    callback(...debounce.args[id]);
    debounce.timers[id] = setTimeout(() => {
      if (debounce.args[id]) {
        callback(...debounce.args[id]);
        debounce.args[id] = null;
        debounce.timers[id] = setTimeout(() => {
          debounce.timers[id] = null;
        }, wait);
      } else {
        debounce.timers[id] = null;
      }
    }, wait);
  } else {
    // Lock active, save latest args
    debounce.args[id] = Array.isArray(args) ? args : [args];
  }
  return id;
};

const wheelcolors = [
  // Your original custom colors
  "#ff0000",
  "#ff00ff",
  "#00ff00",
  "#0000ff",
  "#00ffff",
  "#000000",
  "#69DDFF",
  "#7FB800",
  "#963484",
  "#FF1D15",
  "#FF8600",

  // Precomputed 30° hue-step colors (12 steps, 70% saturation, 50% lightness)
  "#bf3f3f", // 0°
  "#bf9f3f", // 30°
  "#bfff3f", // 60°
  "#7fff3f", // 90°
  "#3fff5f", // 120°
  "#3fffbf", // 150°
  "#3fafff", // 180°
  "#3f3fff", // 210°
  "#9f3fff", // 240°
  "#ff3fff", // 270°
  "#ff3f7f", // 300°
  "#ff3f3f"  // 330°
];

// String prototype using the precomputed array
String.prototype.toHex = function() {
  let hash = 0;
  for (let i = 0; i < this.length; i++) {
    hash = (hash * 31 + this.charCodeAt(i)) >>> 0;
  }
  return wheelcolors[hash % wheelcolors.length];
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
      details_0.open = false;
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
      img.src = value.Foto || "static/ico/user_generic.png";
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
        details_0.open = false;
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
  }, ],
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
  }, ],
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
  }, ],
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
    value: "Almendras",
    key: "Leche",
    className: "btn3",
    img: ["static/ico/milk.png", "static/ico/almond.svg"],
  },
  {
    value: "Agua",
    key: "Leche",
    className: "btn3",
    img: ["static/ico/water_tap.png"],
  }, ],
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
  }, ],
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
  }, ],
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
  }, ],
};
var SC_Personas = {};
// Listado precargado de personas:
function TS_decrypt(input, secret, callback) {
  // if input starts with "SEA{" and ends with "}", then it's encrypted with SEA
  // if not, it is encrypted with RSA
  if (typeof input != "string") {
    callback(input);
  } else if (input.startsWith("SEA{") && input.endsWith("}")) {
    Gun.SEA.decrypt(input, secret).then((decrypted) => {
      callback(decrypted);
    });
  } else if (input.startsWith("RSA{") && input.endsWith("}")) {
    // ignore RSA{}
    var data = input.slice(4, -1);
    var decrypted = CryptoJS.AES.decrypt(data, secret).toString(CryptoJS.enc.Utf8);
    callback(JSON.parse(decrypted));
  }
}
function TS_encrypt(input, secret, callback, mode = "RSA") {
  if (mode == "SEA") {
    Gun.TS_encrypt(input, secret).then((encrypted) => {
      callback(encrypted);
    });
  } else if (mode == "RSA") {
    var encrypted = CryptoJS.AES.encrypt(JSON.stringify(input), secret).toString();
    callback("RSA{" + encrypted + "}");
  }
}
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
      TS_decrypt(data, SECRET, (data) => {
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
          json["Tamaño"] == "Pequeño" && ["de Vaca", "Sin lactosa", "Vegetal", "Almendras"].includes(json["Leche"])
        ) {
          valores += "<small>(P = 10c)</small>";
        }
        // Leche grande = 20c
        if (
          json["Tamaño"] == "Grande" && ["de Vaca", "Sin lactosa", "Vegetal", "Almendras"].includes(json["Leche"])
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
    json["Tamaño"] == "Pequeño" && ["de Vaca", "Sin lactosa", "Vegetal", "Almendras"].includes(json["Leche"])
  ) {
    precio += 10;
    valores += "Leche pequeña = 10c\n";
  }
  // Leche grande = 20c
  if (
    json["Tamaño"] == "Grande" && ["de Vaca", "Sin lactosa", "Vegetal", "Almendras"].includes(json["Leche"])
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
  var debounce_search = safeuuid();
  var debounce_load = safeuuid();
  
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
    () => debounce(debounce_search, render, 300, [rows])
  );
  
  function searchInData(data, searchValue, config) {
    if (!searchValue) return true;
    
    // Search in ID
    if (data._key.toLowerCase().includes(searchValue)) return true;
    
    // Search in configured fields
    for (var field of config) {
      const value = data[field.key] || field.default || "";
      
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
          var persona = SC_Personas[value] || { Nombre: "", Region: "" };
          if (field.self == true) {
            persona = data || { Nombre: "", Region: "" };
          }
          if (persona) {
            // Search in persona fields
            if (persona.Nombre.toLowerCase().includes(searchValue))
              return true;
            if (persona.Region.toLowerCase().includes(searchValue))
              return true;
          }
          break;
        case "fecha":
        case "fecha-iso":
          // Format date as DD/MM/YYYY for searching
          if (value) {
            const fechaArray = value.split("-");
            const formattedDate = `${fechaArray[2]}/${fechaArray[1]}/${fechaArray[0]}`;
            if (formattedDate.includes(searchValue)) return true;
          }
          break;
        default:
          // For raw and other types, search in the direct value
          if (String(value).toLowerCase().includes(searchValue)) return true;
      }
    }
    return false;
  }
  
  // --- Optimized render function ---
  var lastSearchValue = "";
  var lastFilteredSorted = [];
  function sorter(a, b) {
    // 1. Fecha (ascending)
    if (a.Fecha && b.Fecha && a.Fecha !== b.Fecha) {
      return a.Fecha > b.Fecha ? -1 : 1;
    }
    // 2. Region (ascending, from SC_Personas if Persona exists)
    const regionA = a.Persona && SC_Personas[a.Persona] ? SC_Personas[a.Persona].Region || "" : a.Region || "";
    const regionB = b.Persona && SC_Personas[b.Persona] ? SC_Personas[b.Persona].Region || "" : b.Region || "";
    if (regionA !== regionB) {
      return regionA < regionB ? -1 : 1;
    }
    // 3. Persona (Nombre, ascending, from SC_Personas if Persona exists)
    const nombrePersonaA = a.Persona && SC_Personas[a.Persona] ? SC_Personas[a.Persona].Nombre || "" : "";
    const nombrePersonaB = b.Persona && SC_Personas[b.Persona] ? SC_Personas[b.Persona].Nombre || "" : "";
    if (nombrePersonaA !== nombrePersonaB) {
      return nombrePersonaA.toLowerCase() < nombrePersonaB.toLowerCase() ? -1 : 1;
    }
    // 4. Nombre (ascending, from a.Nombre/b.Nombre)
    if (a.Nombre && b.Nombre && a.Nombre !== b.Nombre) {
      return a.Nombre.toLowerCase() < b.Nombre.toLowerCase() ? -1 : 1;
    }
    return 0;
  }

  function getFilteredSortedRows(searchValue) {
    // Only use cache if searchValue is not empty and cache is valid
    if (searchValue && searchValue === lastSearchValue && lastFilteredSorted.length > 0) {
      return lastFilteredSorted;
    }
    const filtered = Object.entries(rows)
      .filter(([_, data]) => searchInData(data, searchValue, config))
      .map(([_, data]) => data)
      .sort(sorter);
    lastSearchValue = searchValue;
    lastFilteredSorted = filtered;
    return filtered;
  }

  function render(rows) {
    const searchValue = searchKeyEl.value.toLowerCase().trim();
    // Use document fragment for batch DOM update
    const fragment = document.createDocumentFragment();
    const filteredSorted = getFilteredSortedRows(searchValue);
    for (let i = 0; i < filteredSorted.length; i++) {
      const data = filteredSorted[i];
      if (canAddCallback != undefined && canAddCallback(data) === true) {
        continue;
      }
      const new_tr = document.createElement("tr");
      if (rowCallback != undefined) {
        rowCallback(data, new_tr);
      }
      config.forEach((key) => {
        switch (key.type) {
          case "raw":
          case "text": {
            const tdRaw = document.createElement("td");
            const rawContent = (String(data[key.key]) || key.default || "").replace(/\n/g, "<br>");
            tdRaw.innerHTML = rawContent;
            new_tr.appendChild(tdRaw);
            break;
          }
          case "fecha":
          case "fecha-iso": {
            const tdFechaISO = document.createElement("td");
            if (data[key.key]) {
              const fechaArray = data[key.key].split("-");
              tdFechaISO.innerText = fechaArray[2] + "/" + fechaArray[1] + "/" + fechaArray[0];
            }
            new_tr.appendChild(tdFechaISO);
            break;
          }
          case "template": {
            const tdCustomTemplate = document.createElement("td");
            new_tr.appendChild(tdCustomTemplate);
            key.template(data, tdCustomTemplate);
            break;
          }
          case "comanda": {
            const tdComanda = document.createElement("td");
            tdComanda.style.verticalAlign = "top";
            const parsedComanda = JSON.parse(data.Comanda);
            const precio = SC_priceCalc(parsedComanda)[0];
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = setLayeredImages(parsedComanda, data._key);
            tdComanda.appendChild(tempDiv.firstChild);
            const pre = document.createElement("pre");
            pre.style.fontSize = "15px";
            pre.style.display = "inline-block";
            pre.style.margin = "0";
            pre.style.verticalAlign = "top";
            pre.style.padding = "5px";
            pre.style.background = "rgba(255, 255, 0, 0.5)";
            pre.style.border = "1px solid rgba(0, 0, 0, 0.2)";
            pre.style.borderRadius = "5px";
            pre.style.boxShadow = "2px 2px 5px rgba(0, 0, 0, 0.1)";
            pre.style.height = "100%";
            const spanPrecio = document.createElement("span");
            spanPrecio.style.fontSize = "20px";
            spanPrecio.innerHTML = SC_Personas[data.Persona].Puntos >= 10 ? `Total: Gratis!(${precio}c)` : `Total: ${precio}c`;
            pre.innerHTML = "<b>Ticket de compra</b> ";
            pre.appendChild(document.createTextNode("\n"));
            pre.innerHTML += SC_parse_short(parsedComanda) + "<hr>" + data.Notas + "<hr>";
            pre.appendChild(spanPrecio);
            tdComanda.appendChild(pre);
            new_tr.appendChild(tdComanda);
            break;
          }
          case "comanda-status": {
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
                TS_encrypt(data, SECRET, (encrypted) => {
                  betterGunPut(ref.get(data._key), encrypted);
                  toastr.success("Guardado!");
                });
                return false;
              };
              return button;
            };
            const buttons = [
              createButton("Pedido", "Pedido"),
              createButton("En preparación", "En preparación"),
              createButton("Listo", "Listo"),
              createButton("Entregado", "Entregado"),
              createButton("Deuda", "Deuda"),
            ];
            const paidButton = document.createElement("button");
            paidButton.textContent = "Pagado";
            paidButton.onclick = (event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!confirm("¿Quieres marcar como pagado? - Se borrara la comanda y se actualizarán los puntos.")) {
                return false;
              }
              data.Estado = "Pagado";
              betterGunPut(ref.get(data._key), null);
              toastr.success("Guardado!");
              if (SC_Personas[data.Persona].Puntos >= 10 && confirm("¿Pagar con Puntos? - Cancela para pagar con Efectivo.")) {
                SC_Personas[data.Persona].Puntos = parseInt(SC_Personas[data.Persona].Puntos) - 10;
                toastr.success("¡Comada gratis para " + SC_Personas[data.Persona].Nombre + "!");
                toastr.success("¡Comada gratis para " + SC_Personas[data.Persona].Nombre + "!");
              } else {
                SC_Personas[data.Persona].Puntos = parseInt(SC_Personas[data.Persona].Puntos) + 1;
                toastr.success("¡Comada DE PAGO!");
              }
              TS_encrypt(SC_Personas[data.Persona], SECRET, (encrypted) => {
                betterGunPut(gun.get(TABLE).get("personas").get(data.Persona), encrypted);
              });
              return false;
            };
            td.append(data.Fecha)
            td.append(document.createElement("br"))
            buttons.forEach((button) => {
              td.appendChild(button);
              td.appendChild(document.createElement("br"));
            });
            td.appendChild(paidButton);
            new_tr.appendChild(td);
            break;
          }
          case "persona": {
            let persona = key.self === true ? data : SC_Personas[data[key.key]] || {};
            const regco = stringToColour((persona.Region || "?").toLowerCase());
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
            infoSpan.appendChild(document.createTextNode(persona.Nombre || ""));
            infoSpan.appendChild(document.createElement("br"));
            const pointsSpan = document.createElement("span");
            pointsSpan.style.fontSize = "17px";
            pointsSpan.textContent = (persona.Puntos || "0") + " puntos.";
            infoSpan.appendChild(pointsSpan);
            tdPersona.appendChild(infoSpan);
            new_tr.appendChild(tdPersona);
            break;
          }
          default:
            break;
        }
      });
      new_tr.onclick = (event) => {
        setUrlHash(pageco + "," + data._key);
      };
      fragment.appendChild(new_tr);
    }
    // Replace tbody in one operation
    tablebody_EL.innerHTML = "";
    tablebody_EL.appendChild(fragment);
  }
  ref.map().on((data, key, _msg, _ev) => {
    EventListeners.GunJS.push(_ev);
    function add_row(data, key) {
      if (data != null) {
        data["_key"] = key;
        rows[key] = data;
      } else {
        delete rows[key];
      }
      debounce(debounce_load, render, 300, [rows])
    }
    if (typeof data == "string") {
      TS_decrypt(data, SECRET, (data) => {
        add_row(data, key);
      });
    } else {
      add_row(data, key);
    }
  });
}

function BuildQR(mid, label) {
  return `
  <span style="border: 2px dashed black; padding: 10px; display: inline-block; background: white; border-radius: 7px; text-align: center; margin: 10px;">
      <b>TeleSec QR</b>
      <br>${toHtml(quickresponse(mid),[6,6])}<br>
      <small>${label}</small>
  </span>
  `
}

var PAGES = {};
var PERMS = {
  "ADMIN": "Administrador",
};
function checkRole(role) {
  var roles = SUB_LOGGED_IN_DETAILS.Roles || ""
  var rolesArr = roles.split(",")
  if (rolesArr.includes("ADMIN") || rolesArr.includes(role) || AC_BYPASS) {
    return true
  } else {
  return false
  }
}
function SetPages() {
  document.getElementById("appendApps2").innerHTML = ""
  Object.keys(PAGES).forEach((key) => {
    if (PAGES[key].Esconder == true) {
      return;
    }
    if (PAGES[key].AccessControl == true) {
      var roles = SUB_LOGGED_IN_DETAILS.Roles || ""
      var rolesArr = roles.split(",")
      if (rolesArr.includes("ADMIN") || rolesArr.includes(key) || AC_BYPASS) {
        
      } else {
        return
      }
      
    }
    var a = document.createElement("a");
    var img = document.createElement("img")
    var label = document.createElement("div")
    a.className = "ribbon-button";
    a.href = "#" + key;
    label.innerText = PAGES[key].Title;
    label.className = "label"
    img.src = PAGES[key].icon || "static/appico/File_Plugin.svg"
    a.append(img, label)
    document.getElementById("appendApps2").append(a);
  });
  var a = document.createElement("a");
  var img = document.createElement("img")
  var label = document.createElement("div")
  a.className = "ribbon-button";
  a.href = "#index,qr";
  label.innerText = "Escanear QR";
  label.className = "label"
  img.src = "static/appico/App_CodyCam.svg"
  a.append(img, label)
  document.getElementById("appendApps2").append(a);
}
var Booted = false;
var TimeoutBoot = 6;
var BootLoops = 0;
getPeers();
setInterval(() => {
  getPeers();
}, 750);

var BootIntervalID = setInterval(() => {
  BootLoops += 1;
  if ((BootLoops >= TimeoutBoot || window.navigator.onLine == false) && !Booted) {
    Booted = true;
    document.getElementById("loading").style.display = "none";
    toastr.error("Sin conexion! Los cambios se sincronizarán cuando te vuelvas a conectar.")
    if (!SUB_LOGGED_IN) {
      open_page("login");
    } else {
      SetPages()
      open_page(location.hash.replace("#", ""));
    }
    clearInterval(BootIntervalID);
  }
  if (ConnectionStarted && !Booted) {
    Booted = true;
    document.getElementById("loading").style.display = "none";
    if (!SUB_LOGGED_IN) {
      open_page("login");
      return;
    }
    SetPages()
    open_page(location.hash.replace("#", ""));
    clearInterval(BootIntervalID);
  }
}, 1000);


const tabs = document.querySelectorAll('.ribbon-tab');
const detailTabs = {
  modulos: document.getElementById('tab-modulos'),
  buscar: document.getElementById('tab-buscar'),
  credenciales: document.getElementById('tab-credenciales')
};

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const selected = tab.getAttribute('data-tab');
    
    // Toggle details
    for (const [key, detailsEl] of Object.entries(detailTabs)) {
      if (key === selected) {
        detailsEl.setAttribute('open', '');
      } else {
        detailsEl.removeAttribute('open');
      }
    }
    
    // Toggle tab active class
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

// Global Search Functionality
function GlobalSearch() {
  const searchData = {};
  const allSearchableModules = [
    { role: 'personas', key: 'personas', title: 'Personas', icon: 'static/appico/File_Person.svg', fields: ['Nombre', 'Region', 'Notas', 'email'] },
    { role: 'materiales', key: 'materiales', title: 'Materiales', icon: 'static/appico/Database.svg', fields: ['Nombre', 'Referencia', 'Ubicacion', 'Notas'] },
    { role: 'supercafe', key: 'supercafe', title: 'SuperCafé', icon: 'static/appico/Coffee.svg', fields: ['Persona', 'Comanda', 'Estado'] },
    { role: 'comedor', key: 'comedor', title: 'Comedor', icon: 'static/appico/Meal.svg', fields: ['Fecha', 'Platos'] },
    { role: 'notas', key: 'notas', title: 'Notas', icon: 'static/appico/Notepad.svg', fields: ['Asunto', 'Contenido', 'Autor'] },
    { role: 'notificaciones', key: 'notificaciones', title: 'Avisos', icon: 'static/appico/Alert_Warning.svg', fields: ['Asunto', 'Mensaje', 'Origen', 'Destino'] },
    { role: 'aulas', key: 'aulas_solicitudes', title: 'Solicitudes de Aulas', icon: 'static/appico/Classroom.svg', fields: ['Asunto', 'Contenido', 'Solicitante'] },
    { role: 'aulas', key: 'aulas_informes', title: 'Informes de Aulas', icon: 'static/appico/Newspaper.svg', fields: ['Asunto', 'Contenido', 'Autor', 'Fecha'] }
  ];
  
  // Filter modules based on user permissions
  const searchableModules = allSearchableModules.filter(module => {
    return checkRole(module.role);
  });

  // Load all data from modules
  function loadAllData() {
    searchableModules.forEach(module => {
      searchData[module.key] = {};
      gun.get(TABLE).get(module.key).map().on((data, key) => {
        if (!data) return;
        
        function processData(processedData) {
          if (processedData && typeof processedData === 'object') {
            searchData[module.key][key] = {
              _key: key,
              _module: module.key,
              _title: module.title,
              _icon: module.icon,
              ...processedData
            };
          }
        }

        if (typeof data === "string") {
          TS_decrypt(data, SECRET, processData);
        } else {
          processData(data);
        }
      });
    });
  }

  // Perform search across all modules
  function performSearch(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    const results = [];
    const searchLower = searchTerm.toLowerCase();

    searchableModules.forEach(module => {
      const moduleData = searchData[module.key] || {};
      
      Object.values(moduleData).forEach(item => {
        if (!item) return;
        
        let relevanceScore = 0;
        let matchedFields = [];
        
        // Search in key/ID
        if (item._key && item._key.toLowerCase().includes(searchLower)) {
          relevanceScore += 10;
          matchedFields.push('ID');
        }
        
        // Search in configured fields
        module.fields.forEach(field => {
          const value = item[field];
          if (!value) return;
          
          let searchValue = '';
          
          // Handle special field types
          if (field === 'Persona' && SC_Personas[value]) {
            searchValue = SC_Personas[value].Nombre || '';
          } else if (field === 'Comanda' && typeof value === 'string') {
            try {
              const comandaData = JSON.parse(value);
              searchValue = Object.values(comandaData).join(' ');
            } catch (e) {
              searchValue = value;
            }
          } else {
            searchValue = String(value);
          }
          
          if (searchValue.toLowerCase().includes(searchLower)) {
            relevanceScore += field === 'Nombre' || field === 'Asunto' ? 5 : 2;
            matchedFields.push(field);
          }
        });
        
        if (relevanceScore > 0) {
          results.push({
            ...item,
            _relevance: relevanceScore,
            _matchedFields: matchedFields
          });
        }
      });
    });
    
    return results.sort((a, b) => b._relevance - a._relevance);
  }

  // Render search results
  function renderResults(results, container) {
    if (results.length === 0) {
      container.innerHTML = `
        <fieldset>
          <legend>Sin resultados</legend>
          <div>🚫 No se encontraron resultados</div>
          <p>Prueba con otros términos de búsqueda o usa filtros diferentes</p>
        </fieldset>
      `;
      return;
    }
    
    let html = '';
    
    // Group by module
    const groupedResults = {};
    results.forEach(result => {
      if (!groupedResults[result._module]) {
        groupedResults[result._module] = [];
      }
      groupedResults[result._module].push(result);
    });
    
    Object.entries(groupedResults).forEach(([moduleKey, moduleResults]) => {
      const module = searchableModules.find(m => m.key === moduleKey);
      if (!module) return;
      
      html += `
        <fieldset>
          <legend>
            <img src="${module.icon}" height="20"> ${module.title} (${moduleResults.length})
          </legend>
      `;
      
      moduleResults.slice(0, 5).forEach(result => {
        let title = result.Nombre || result.Asunto || result._key;
        let subtitle = '';
        
        // Handle comedor specific display
        if (result._module === 'comedor') {
          title = result.Fecha ? `Menú del ${result.Fecha.split('-').reverse().join('/')}` : result._key;
          if (result.Platos) {
            subtitle = `🍽️ ${result.Platos.substring(0, 50)}${result.Platos.length > 50 ? '...' : ''}`;
          }
        } else {
          // Default display for other modules
          if (result.Persona && SC_Personas[result.Persona]) {
            subtitle = `👤 ${SC_Personas[result.Persona].Nombre}`;
          }
          if (result.Fecha) {
            const fecha = result.Fecha.split('-').reverse().join('/');
            subtitle += subtitle ? ` • 📅 ${fecha}` : `📅 ${fecha}`;
          }
          if (result.Region) {
            subtitle += subtitle ? ` • 🌍 ${result.Region}` : `🌍 ${result.Region}`;
          }
        }
        
        html += `
          <button onclick="navigateToResult('${moduleKey}', '${result._key}')" class="button">
            <strong>${title}</strong>
            ${subtitle ? `<br><small>${subtitle}</small>` : ''}
            <br><code>📍 ${result._matchedFields.join(', ')}</code>
          </button>
        `;
      });
      
      if (moduleResults.length > 5) {
        let moreLink = moduleKey;
        if (moduleKey === 'aulas_solicitudes') {
          moreLink = 'aulas,solicitudes';
        } else if (moduleKey === 'aulas_informes') {
          moreLink = 'aulas,informes';
        }
        
        html += `
          <hr>
          <button onclick="setUrlHash('${moreLink}')" class="btn8">
            Ver ${moduleResults.length - 5} resultados más en ${module.title}
          </button>
        `;
      }
      
      html += '</fieldset>';
    });
    
    container.innerHTML = html;
  }

  return {
    loadAllData,
    performSearch,
    renderResults,
    getAccessibleModules: () => searchableModules
  };
}

// Helper function to navigate to search results
function navigateToResult(moduleKey, resultKey) {
  switch (moduleKey) {
    case 'aulas_solicitudes':
      setUrlHash('aulas,solicitudes,' + resultKey);
      break;
    case 'aulas_informes':
      setUrlHash('aulas,informes,' + resultKey);
      break;
    default:
      setUrlHash(moduleKey + ',' + resultKey);
  }
}