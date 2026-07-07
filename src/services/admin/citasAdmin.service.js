import { prisma } from "../../../prisma/client.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../utils/appError.js";
import { buildSlotDate, dayRange } from "../../utils/adminDate.js";
import {
  registrarAuditoriaSeguro,
  sanitize,
} from "./auditoriaAdmin.service.js";

export const getCitasAdminService = async ({ estado, fecha }) => {
  const citas = await prisma.cita.findMany({
    where: {
      ...(estado && { estado }),
      ...(fecha && { fecha: dayRange(fecha) }),
    },
    include: {
      paciente: { include: { usuario: true } },
      medico: { include: { usuario: true, especialidad: true } },
    },
    orderBy: { fecha: "desc" },
  });

  return sanitize(
    citas.map((cita) => ({
      ...cita,
      codigoCita: `CIT-${cita.id}`,
    })),
  );
};

export const reprogramarCitaAdminService = async ({
  req,
  id,
  medicoId,
  nuevaFecha,
  nuevaHora,
}) => {
  const fecha = buildSlotDate(nuevaFecha, nuevaHora);
  const citaActual = await prisma.cita.findUnique({ where: { id } });
  if (!citaActual) throw new NotFoundError("Cita no encontrada.");

  const nextMedicoId = medicoId || citaActual.medicoId;
  const ocupada = await prisma.cita.findFirst({
    where: {
      id: { not: id },
      medicoId: nextMedicoId,
      fecha,
      estado: { not: "CANCELADA" },
    },
  });
  if (ocupada) throw new ConflictError("Slot ocupado.");

  const cita = await prisma.cita.update({
    where: { id },
    data: { fecha, medicoId: nextMedicoId, estado: "PENDIENTE" },
  });

  await registrarAuditoriaSeguro(req, {
    accion: "REPROGRAMAR_CITA",
    modulo: "Citas",
    entidad: "Cita",
    entidadId: cita.id,
    detalle: {
      fecha: cita.fecha,
      medicoId: cita.medicoId,
      estado: cita.estado,
    },
  });

  return cita;
};

export const reasignarCitaAdminService = async ({ req, id, medicoId }) => {
  const cita = await prisma.cita.findUnique({
    where: { id },
    include: { medico: true },
  });
  if (!cita) throw new NotFoundError("Cita no encontrada.");

  const medico = await prisma.medico.findUnique({ where: { id: medicoId } });
  if (!medico) throw new NotFoundError("Medico no encontrado.");
  if (medico.especialidadId !== cita.medico.especialidadId) {
    throw new BadRequestError("El medico debe ser de la misma especialidad.");
  }

  const ocupada = await prisma.cita.findFirst({
    where: {
      id: { not: id },
      medicoId,
      fecha: cita.fecha,
      estado: { not: "CANCELADA" },
    },
  });
  if (ocupada) throw new ConflictError("Slot ocupado.");

  const actualizada = await prisma.cita.update({
    where: { id },
    data: { medicoId },
  });

  await registrarAuditoriaSeguro(req, {
    accion: "REASIGNAR_CITA",
    modulo: "Citas",
    entidad: "Cita",
    entidadId: actualizada.id,
    detalle: {
      medicoAnteriorId: cita.medicoId,
      medicoNuevoId: actualizada.medicoId,
      fecha: actualizada.fecha,
    },
  });

  return actualizada;
};

export const updateEstadoCitaAdminService = async ({ req, id, estado }) => {
  try {
    const cita = await prisma.cita.update({ where: { id }, data: { estado } });
    await registrarAuditoriaSeguro(req, {
      accion: "CAMBIAR_ESTADO_CITA",
      modulo: "Citas",
      entidad: "Cita",
      entidadId: cita.id,
      detalle: { estado, fecha: cita.fecha },
    });
    return cita;
  } catch (err) {
    if (err.code === "P2025") {
      throw new NotFoundError("Cita no encontrada.");
    }
    throw err;
  }
};
