async function axel(argumento) {
  const toast = toastr.info(argumento, "Mensaje enviado a Axel", {
    timeOut: 0,
    extendedTimeOut: 0,
    closeButton: false
  });

  try {
    const response = await fetch("/domo/_axel.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        cmd: argumento
      })
    });

    const data = await response.json();

    toastr.clear(toast, {force: true});
    toastr.success(data.resp, "Respuesta de Axel");
  } catch (error) {
    toastr.clear(toast, {force: true});
    toastr.error(error.message, "Error al contactar con Axel");
  }
}