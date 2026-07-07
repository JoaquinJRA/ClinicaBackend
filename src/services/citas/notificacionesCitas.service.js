import twilio from "twilio";

const normalizarTelefono = (telefono) => {
  const limpio = String(telefono || "").replace(/\D/g, "");
  if (!limpio) return null;
  return limpio.startsWith("51") ? `+${limpio}` : `+51${limpio}`;
};

export const sendCitaConfirmadaSms = async (cita) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const telefono = normalizarTelefono(cita.paciente?.telefono);
  const hasValidFrom = from && !from.startsWith("TU_");
  const hasMessagingService =
    messagingServiceSid && !messagingServiceSid.startsWith("TU_");

  if (!accountSid || !authToken || !telefono || (!hasValidFrom && !hasMessagingService)) {
    return false;
  }

  const fecha = new Date(cita.fecha).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  const medico = `${cita.medico.usuario.nombre} ${cita.medico.usuario.apellido}`;
  const especialidad = cita.medico.especialidad.nombre;

  try {
    await twilio(accountSid, authToken).messages.create({
      ...(hasMessagingService ? { messagingServiceSid } : { from }),
      to: telefono,
      body: `Clinica Luz: su cita de ${especialidad} con Dr. ${medico} fue confirmada para el ${fecha}.`,
    });

    return true;
  } catch (_err) {
    return false;
  }
};
