import { prisma } from "../../../prisma/client.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../utils/appError.js";
import { getCostoEspecialidad } from "../../utils/adminCatalogs.js";
import { isValidSlotDate } from "../../utils/citaDate.js";
import { sendCitaConfirmadaSms } from "./notificacionesCitas.service.js";

const validateFechaCitaDisponible = async ({
  medicoId,
  fechaCita,
  fechaLocal,
  excludeCitaId,
}) => {
  if (fechaLocal < new Date()) {
    throw new BadRequestError("No se pueden agendar citas en fechas pasadas");
  }

  if (!isValidSlotDate(fechaCita)) {
    throw new BadRequestError("Hora no valida");
  }

  const citaExistente = await prisma.cita.findFirst({
    where: {
      ...(excludeCitaId && { id: { not: excludeCitaId } }),
      medicoId,
      fecha: fechaCita,
      estado: { not: "CANCELADA" },
    },
  });

  if (citaExistente) {
    throw new ConflictError("Slot no disponible");
  }
};

export const createCitaService = async ({
  pacienteId,
  medicoId,
  fecha,
  motivo,
}) => {
  const { dbDate: fechaCita, localDate: fechaLocal } = fecha;

  await validateFechaCitaDisponible({
    medicoId,
    fechaCita,
    fechaLocal,
  });

  try {
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
        monto: getCostoEspecialidad(med?.especialidad?.nombre),
        metodoPago: "EFECTIVO",
        estado: "PENDIENTE",
      },
    });

    return cita;
  } catch (err) {
    if (err.code === "P2003") {
      throw new NotFoundError("Paciente o medico no encontrado.");
    }
    throw err;
  }
};

export const updateCitaService = async ({ id, medicoId, fecha, motivo }) => {
  const { dbDate: fechaCita, localDate: fechaLocal } = fecha;

  await validateFechaCitaDisponible({
    medicoId,
    fechaCita,
    fechaLocal,
    excludeCitaId: id,
  });

  try {
    const citaActual = await prisma.cita.findUnique({ where: { id } });
    if (!citaActual) throw new NotFoundError("Cita no encontrada.");

    return await prisma.cita.update({
      where: { id },
      data: {
        medicoId,
        fecha: fechaCita,
        motivo,
        estado: "PENDIENTE",
      },
    });
  } catch (err) {
    if (err.code === "P2003") {
      throw new NotFoundError("Medico no encontrado.");
    }
    throw err;
  }
};

export const updateEstadoCitaService = async ({ id, estado }) => {
  try {
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

    return { ...cita, smsEnviado };
  } catch (err) {
    if (err.code === "P2025") {
      throw new NotFoundError("Cita no encontrada.");
    }
    throw err;
  }
};
