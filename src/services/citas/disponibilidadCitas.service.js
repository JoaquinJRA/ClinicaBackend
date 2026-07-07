import { prisma } from "../../../prisma/client.js";
import { SLOTS } from "../../utils/adminCatalogs.js";
import {
  buildSlotDate,
  formatDateKey,
  getSlotTime,
} from "../../utils/citaDate.js";

export const getDisponibilidadMesService = async ({
  year,
  month,
  especialidadId,
}) => {
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

  return disponibilidad;
};

export const getSlotsDisponiblesService = async ({ fecha, especialidadId }) => {
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

  return SLOTS.map((time) => {
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
};
