PAGES.index = {
  //navcss: "btn1",
  Title: "Inicio",
  index: function () {
    container.innerHTML = `
                <h1>¡Hola, ${SUB_LOGGED_IN_DETAILS.Nombre}!</h1>
                <em>Utiliza el menú superior para abrir un modulo</em>
                <br><br>
                <button class="btn1" onclick="LogOutTeleSec()">Cerrar sesión</button>
            `;
  },
};
