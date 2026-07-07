import { prisma } from "../../../prisma/client.js";

export const getCitasPacienteService = async ({ pacienteId, estado }) => {
  return prisma.cita.findMany({
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
};
