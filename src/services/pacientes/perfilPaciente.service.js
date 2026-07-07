import { prisma } from "../../../prisma/client.js";
import { NotFoundError } from "../../utils/appError.js";

export const getPerfilPacienteService = async (id) => {
  const paciente = await prisma.paciente.findUnique({
    where: { id },
    include: {
      usuario: { select: { nombre: true, apellido: true, email: true } },
      alergias: true,
      medicamentos: { where: { activo: true } },
      historialMedico: true,
    },
  });

  if (!paciente) throw new NotFoundError("Paciente no encontrado.");

  return paciente;
};

export const updatePerfilPacienteService = async (id, data) => {
  try {
    return await prisma.paciente.update({
      where: { id },
      data,
    });
  } catch (err) {
    if (err.code === "P2025") {
      throw new NotFoundError("Paciente no encontrado.");
    }
    throw err;
  }
};
