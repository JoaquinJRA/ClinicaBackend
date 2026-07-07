import { prisma } from "../../../prisma/client.js";
import { ForbiddenError, NotFoundError } from "../../utils/appError.js";

export const getAlergiasPacienteService = async (pacienteId) => {
  return prisma.alergias.findMany({
    where: { pacienteId },
    orderBy: { creadoEn: "desc" },
  });
};

export const createAlergiaPacienteService = async ({
  pacienteId,
  nombre,
  severidad,
}) => {
  return prisma.alergias.create({
    data: {
      nombre,
      severidad,
      pacienteId,
    },
  });
};

export const deleteAlergiaPacienteService = async ({ pacienteId, id }) => {
  const alergia = await prisma.alergias.findUnique({ where: { id } });
  if (!alergia) throw new NotFoundError("Alergia no encontrada.");
  if (alergia.pacienteId !== pacienteId) {
    throw new ForbiddenError("La alergia no pertenece al paciente.");
  }

  await prisma.alergias.delete({ where: { id } });
};
