import { prisma } from "../../../prisma/client.js";
import { sanitize } from "./auditoriaAdmin.service.js";

export const getEspecialidadesAdminService = async () => {
  return prisma.especialidad.findMany({
    orderBy: { nombre: "asc" },
  });
};

export const getMedicosAdminService = async (especialidadId) => {
  const medicos = await prisma.medico.findMany({
    where: { estado: "ACTIVO", ...(especialidadId && { especialidadId }) },
    include: { usuario: true, especialidad: true },
    orderBy: { id: "asc" },
  });

  return sanitize(medicos);
};
