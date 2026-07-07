import { prisma } from "../../../prisma/client.js";

export const getEspecialidadesCitasService = async () => {
  return prisma.especialidad.findMany({
    select: { id: true, nombre: true, descripcion: true },
    orderBy: { nombre: "asc" },
  });
};
