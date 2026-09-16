// ============================================================
// Aviso de reserva por correo (gratis, con tu Gmail)
// ============================================================
// QUÉ HACE: cada vez que alguien reserva, Supabase avisa aquí
// y este script te manda un correo a tu correo de la hoja (CONFIG).
//
// CÓMO INSTALAR (una sola vez, 5 minutos):
//   1. Abre  https://script.google.com  (con tu cuenta de Google)
//   2. Click "Nuevo proyecto" (o extensiones -> Apps Script)
//   3. Borra todo lo que traiga y pega TODO este archivo.
//   4. Cambia el nombre del proyecto a "Aviso reservas".
//   5. Click en botón "Implementar" (Deploy) -> "Nueva implementación"
//      -> Tipo: Aplicación web. Configura:
//        - "Ejecutar como":        Yo (con tu cuenta)
//        - "Acceso a la aplicación": Cualquier persona
//      -> Click "Implementar" (Deploy). Te pedirá autorizar (avanzado ->
//         ir a "Aviso reservas" -> permitir). 
//   6. Copia la URL que empieza con https://script.google.com/macros/s/...
//      y pégala en Supabase -> Database -> Webhooks (paso de abajo).
// ============================================================

// CORREO DE RESPUESTA (respuesta a los correos que se manden, opcional)
var CORREO_REMITENTE = Session.getActiveUser().getEmail();

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var r = body.record || {};          // la fila insertada en reservas
    var negocio = 'Barba Maestra';
    var fecha = String(r.fecha || '').split('-').reverse().join('/') || 'sin día';
    var hora = r.hora || 'sin hora';
    var servicio = r.servicio || 'Hora seleccionada en agenda';
    var cliente = r.nombre || 'Sin nombre';
    var destino = r.notify || '';       // correo del dueño desde la hoja (CONFIG)

    if (!destino) return responder(false, 'sin correo de destino');

    var asunto = 'Nueva cita · ' + negocio + ' · ' + fecha + ' ' + hora;
    var cuerpo =
      'Se registró una cita en ' + negocio + ':\n\n' +
      'Servicio: ' + servicio + '\n' +
      'Día: ' + fecha + '\n' +
      'Hora: ' + hora + '\n' +
      'Cliente: ' + (cliente || 'Sin nombre') + '\n\n' +
      'Revisa tu agenda y confirma por WhatsApp.';

    MailApp.sendEmail({
      to: destino,
      subject: asunto,
      body: cuerpo,
      replyTo: CORREO_REMITENTE
    });

    return responder(true, 'correo enviado a ' + destino);
  } catch (err) {
    return responder(false, String(err));
  }
}

function responder(ok, msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: ok, message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}