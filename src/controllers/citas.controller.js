import { prisma } from "../../prisma/client.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../utils/appError.js";
import twilio from "twilio";

const SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
];
const ESTADOS_CITA = ["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"];
const COSTOS_ESPECIALIDAD = {
  "Medicina General": 120,
  Cardiología: 200,
  Cardiologia: 200,
  Pediatría: 150,
  Pediatria: 150,
  Dermatología: 180,
  Dermatologia: 180,
};

const normalizarTelefono = (telefono) => {
  const limpio = String(telefono || "").replace(/\D/g, "");
  if (!limpio) return null;
  return limpio.startsWith("51") ? `+${limpio}` : `+51${limpio}`;
};

const sendCitaConfirmadaSms = async (cita) => {
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

const toPositiveInt = (value, field) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new BadRequestError(`${field} invalido.`);
  }
  return number;
};

const toYear = (value) => {
  const year = toPositiveInt(value, "year");
  if (year < 1900 || year > 3000) {
    throw new BadRequestError("year invalido.");
  }
  return year;
};

const toMonth = (value) => {
  const month = toPositiveInt(value, "month");
  if (month < 1 || month > 12) {
    throw new BadRequestError("month invalido.");
  }
  return month;
};

const formatDateKey = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseFechaDia = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    throw new BadRequestError("Fecha invalida.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestError("Fecha invalida.");
  }

  return date;
};

const buildSlotDate = (baseDate, time) => {
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(
    baseDate.getUTCFullYear(),
    baseDate.getUTCMonth(),
    baseDate.getUTCDate(),
    hour,
    minute,
    0,
    0,
  ));
};

const getSlotTime = (date) => {
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
};

const isValidSlotDate = (date) => {
  return (
    SLOTS.includes(getSlotTime(date)) &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
};

const parseFechaCita = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value || "",
  );

  if (!match) {
    throw new BadRequestError("Fecha invalida.");
  }

  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw = "00"] =
    match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw);
  const localDate = new Date(year, month - 1, day, hour, minute, second, 0);
  const dbDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second, 0));

  if (
    localDate.getFullYear() !== year ||
    localDate.getMonth() !== month - 1 ||
    localDate.getDate() !== day ||
    localDate.getHours() !== hour ||
    localDate.getMinutes() !== minute ||
    localDate.getSeconds() !== second
  ) {
    throw new BadRequestError("Fecha invalida.");
  }

  return { dbDate, localDate };
};

export const getDisponibilidadMes = async (req, res, next) => {
  try {
    const year = toYear(req.query.year);
    const month = toMonth(req.query.month);
    const especialidadId = toPositiveInt(
      req.query.especialidadId,
      "especialidadId",
    );

    const medicos = await prisma.medico.findMany({
      where: { especialidadId, estado: "ACTIVO" },
      select: { id: true },
    });
    const medicoIds = medicos.map((medico) => medico.id);
    const totalSlots = medicoIds.length * SLOTS.length;
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const startOfNextMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

    const citas = medicoIds.length
      ? await prisma.cita.findMany({
          where: {
            fecha: { gte: startOfMonth, lt: startOfNextMonth },
            medicoId: { in: medicoIds },
            estado: { not: "CANCELADA" },
          },
          select: { fecha: true },
        })
      : [];

    const ocupadosPorDia = citas.reduce((map, cita) => {
      const key = formatDateKey(cita.fecha);
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map());

    const disponibilidad = {};
    for (
      let day = new Date(startOfMonth);
      day < startOfNextMonth;
      day.setUTCDate(day.getUTCDate() + 1)
    ) {
      const key = formatDateKey(day);
      const slotsOcupados = ocupadosPorDia.get(key) || 0;
      disponibilidad[key] = {
        hasAvailable: slotsOcupados < totalSlots,
        slotsOcupados,
        totalSlots,
      };
    }

    return res.status(200).json(disponibilidad);
  } catch (err) {
    next(err);
  }
};

export const getEspecialidadesCitas = async (_req, res, next) => {
  try {
    const especialidades = await prisma.especialidad.findMany({
      select: { id: true, nombre: true, descripcion: true },
      orderBy: { nombre: "asc" },
    });

    return res.status(200).json(especialidades);
  } catch (err) {
    next(err);
  }
};

export const getSlotsDisponibles = async (req, res, next) => {
  try {
    const fecha = parseFechaDia(req.query.fecha);
    const especialidadId = toPositiveInt(
      req.query.especialidadId,
      "especialidadId",
    );

    const medicos = await prisma.medico.findMany({
      where: { especialidadId, estado: "ACTIVO" },
      include: {
        usuario: { select: { nombre: true, apellido: true } },
      },
      orderBy: { id: "asc" },
    });
    const medicoIds = medicos.map((medico) => medico.id);
    const inicioDia = buildSlotDate(fecha, SLOTS[0]);
    const finDia = buildSlotDate(fecha, "17:59");

    const citasDelDia = medicoIds.length
      ? await prisma.cita.findMany({
          where: {
            fecha: { gte: inicioDia, lte: finDia },
            medicoId: { in: medicoIds },
            estado: { not: "CANCELADA" },
          },
          select: { fecha: true, medicoId: true },
        })
      : [];

    const citasPorSlot = citasDelDia.reduce((map, cita) => {
      const time = getSlotTime(cita.fecha);
      const medicosOcupados = map.get(time) || [];
      medicosOcupados.push(cita.medicoId);
      map.set(time, medicosOcupados);
      return map;
    }, new Map());

    const slots = SLOTS.map((time) => {
      const medicosOcupados = citasPorSlot.get(time) || [];
      const medicoLibre = medicos.find(
        (medico) => !medicosOcupados.includes(medico.id),
      );

      return {
        time,
        available: Boolean(medicoLibre),
        ...(medicoLibre && {
          medicoId: medicoLibre.id,
          medicoNombre: `${medicoLibre.usuario.nombre} ${medicoLibre.usuario.apellido}`,
        }),
      };
    });

    return res.status(200).json(slots);
  } catch (err) {
    next(err);
  }
};

export const getCitasPaciente = async (req, res, next) => {
  try {
    const pacienteId = toPositiveInt(req.params.pacienteId, "pacienteId");
    const { estado } = req.query;

    if (estado && !ESTADOS_CITA.includes(estado)) {
      throw new BadRequestError("Estado invalido.");
    }

    const citas = await prisma.cita.findMany({
      where: {
        pacienteId,
        ...(estado && { estado }),
      },
      include: {
        medico: {
          include: {
            usuario: { select: { nombre: true, apellido: true } },
            especialidad: true,
          },
        },
      },
      orderBy: { fecha: "desc" },
    });

    return res.status(200).json(citas);
  } catch (err) {
    next(err);
  }
};

export const createCita = async (req, res, next) => {
  try {
    const pacienteId = toPositiveInt(req.body.pacienteId, "pacienteId");
    const medicoId = toPositiveInt(req.body.medicoId, "medicoId");
    const { fecha, motivo } = req.body;
    const { dbDate: fechaCita, localDate: fechaLocal } = parseFechaCita(fecha);

    if (fechaLocal < new Date()) {
      throw new BadRequestError(
        "No se pueden agendar citas en fechas pasadas",
      );
    }

    if (!isValidSlotDate(fechaCita)) {
      throw new BadRequestError("Hora no valida");
    }

    const citaExistente = await prisma.cita.findFirst({
      where: {
        medicoId,
        fecha: fechaCita,
        estado: { not: "CANCELADA" },
      },
    });

    if (citaExistente) {
      throw new ConflictError("Slot no disponible");
    }

    const cita = await prisma.cita.create({
      data: {
        pacienteId,
        medicoId,
        fecha: fechaCita,
        motivo,
        estado: "PENDIENTE",
      },
    });

    const med = await prisma.medico.findUnique({
      where: { id: cita.medicoId },
      include: { especialidad: true },
    });

    await prisma.pago.create({
      data: {
        citaId: cita.id,
        monto: COSTOS_ESPECIALIDAD[med?.especialidad?.nombre] ?? 100,
        metodoPago: "EFECTIVO",
        estado: "PENDIENTE",
      },
    });

    return res.status(201).json(cita);
  } catch (err) {
    if (err.code === "P2003") {
      return next(new NotFoundError("Paciente o medico no encontrado."));
    }
    next(err);
  }
};

export const updateCita = async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id, "id");
    const medicoId = toPositiveInt(req.body.medicoId, "medicoId");
    const { fecha, motivo } = req.body;
    const { dbDate: fechaCita, localDate: fechaLocal } = parseFechaCita(fecha);

    if (fechaLocal < new Date()) {
      throw new BadRequestError(
        "No se pueden agendar citas en fechas pasadas",
      );
    }

    if (!isValidSlotDate(fechaCita)) {
      throw new BadRequestError("Hora no valida");
    }

    const citaActual = await prisma.cita.findUnique({ where: { id } });
    if (!citaActual) throw new NotFoundError("Cita no encontrada.");

    const citaExistente = await prisma.cita.findFirst({
      where: {
        id: { not: id },
        medicoId,
        fecha: fechaCita,
        estado: { not: "CANCELADA" },
      },
    });

    if (citaExistente) {
      throw new ConflictError("Slot no disponible");
    }

    const cita = await prisma.cita.update({
      where: { id },
      data: {
        medicoId,
        fecha: fechaCita,
        motivo,
        estado: "PENDIENTE",
      },
    });

    return res.status(200).json(cita);
  } catch (err) {
    if (err.code === "P2003") {
      return next(new NotFoundError("Medico no encontrado."));
    }
    next(err);
  }
};

export const updateEstadoCita = async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id, "id");
    const { estado } = req.body;

    if (!ESTADOS_CITA.includes(estado)) {
      throw new BadRequestError("Estado invalido.");
    }

    const cita = await prisma.cita.update({
      where: { id },
      data: { estado },
      include: {
        paciente: true,
        medico: {
          include: {
            usuario: { select: { nombre: true, apellido: true } },
            especialidad: true,
          },
        },
      },
    });

    let smsEnviado = false;
    if (estado === "CONFIRMADA") {
      smsEnviado = await sendCitaConfirmadaSms(cita);
    }

    return res.status(200).json({ ...cita, smsEnviado });
  } catch (err) {
    if (err.code === "P2025") {
      return next(new NotFoundError("Cita no encontrada."));
    }
    next(err);
  }
};
