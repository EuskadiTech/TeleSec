PAGES.login = {
    Esconder: true,
    Title: "Login",
    index: function (mid) {
      var field_persona = safeuuid();
      var btn_guardar = safeuuid();
      var btn_reload = safeuuid();
      var div_actions = safeuuid();
      container.innerHTML = `
                <h1>Iniciar sesión</h1>
                <fieldset>
                    <legend>Valores</legend>
                    <input type="hidden" id="${field_persona}">
                    <div id="${div_actions}"></div>
                    <button class="btn5" id="${btn_guardar}">Acceder</button>
                    <button class="btn1" id="${btn_reload}">Recargar lista</button>
                </fieldset>
                <a style="color: rgb(240,240,240)">Acceso sin cuenta - No disponible</a>
                `;
      var divact = document.getElementById(div_actions);
      addCategory_Personas(
        divact,
        SC_Personas,
        "",
        (value) => {
          document.getElementById(field_persona).value = value;
        },
        "¿Quién eres?",
        true,
        "- Pulsa recargar -"
      );
      document.getElementById("appendApps").style.display = "none"
      document.getElementById(btn_guardar).onclick = () => {
        if (document.getElementById(field_persona).value == "") {
          alert("Tienes que elegir tu cuenta!");
          return;
        }
        SUB_LOGGED_IN_ID = document.getElementById(field_persona).value
        SUB_LOGGED_IN_DETAILS = SC_Personas[SUB_LOGGED_IN_ID]
        SUB_LOGGED_IN = true
        setUrlHash("index")
        setUrlHash("index")
        setUrlHash("index")
        document.getElementById("appendApps").style.display = "unset"
      };
      
      document.getElementById(btn_reload).onclick = () => {
        setUrlHash("login," + safeuuid(""))
      };
      
    },
  }