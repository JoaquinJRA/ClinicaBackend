import { prisma } from "../../../prisma/client.js";
import { finDiaUtc, formatHoraUtc, inicioDiaUtc } from "../../utils/doctorDate.js";
import { NotFoundError } from "../../utils/appError.js";

const formatCitaDoctor = (cita) => ({
  id: cita.id,
  fecha: cita.fecha,
  hora: formatHoraUtc(cita.fecha),
  estado: cita.estado,
  motivo: cita.motivo,
  paciente: {
    nombre: cita.paciente.usuario.nombre,
    apellido: cita.paciente.usuario.apellido,
    codigo: `CL-${cita.paciente.id}`,
  },
});

export const getCitasDoctorService = async ({ medicoId, estado, fecha }) => {
  const citas = await prisma.cita.findMany({
    where: {
      medicoId,
      ...(estado && { estado }),
      ...(fecha && { fecha: { gte: inicioDiaUtc(fecha), lte: finDiaUtc(fecha) } }),
    },
    include: {
      paciente: {
        include: { usuario: { select: { nombre: true, apellido: true } } },
      },
    },
    orderBy: { fecha: "asc" },
  });

  return citas.map(formatCitaDoctor);
};

export const updateEstadoCitaDoctorService = async ({
  id,
  estado,
  nuevaFecha,
}) => {
  try {
    return await prisma.cita.update({
      where: { id },
      data: {
        estado,
        ...(nuevaFecha && { fecha: nuevaFecha }),
      },
    });
  } catch (err) {
    if (err.code === "P2025") {
      throw new NotFoundError("Cita no encontrada.");
    }
    throw err;
  }
};
