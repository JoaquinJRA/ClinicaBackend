import { prisma } from "../../../prisma/client.js";
import { getInicioDiaLocal } from "../../utils/date.js";
import { ForbiddenError, NotFoundError } from "../../utils/appError.js";

const ensureMedicamentoPertenecePaciente = (medicamento, pacienteId) => {
  if (!medicamento) throw new NotFoundError("Medicamento no encontrado.");
  if (medicamento.pacienteId !== pacienteId) {
    throw new ForbiddenError("El medicamento no pertenece al paciente.");
  }
};

export const getMedicamentosPacienteService = async (pacienteId) => {
  const hoy = getInicioDiaLocal();

  const medicamentos = await prisma.medicamentos.findMany({
    where: { pacienteId, activo: true },
    include: {
      seguimientos: {
        where: { fecha: hoy },
        take: 1,
      },
    },
    orderBy: { creadoEn: "desc" },
  });

  return medicamentos.map((medicamento) => {
    const seguimientoHoy = medicamento.seguimientos[0] ?? null;
    const { seguimientos, ...data } = medicamento;

    return {
      ...data,
      seguimientoHoy,
    };
  });
};

export const marcarSeguimientoMedicamentoService = async ({
  pacienteId,
  medicamentoId,
  estado,
  fecha,
}) => {
  const medicamento = await prisma.medicamentos.findUnique({
    where: { id: medicamentoId },
  });
  ensureMedicamentoPertenecePaciente(medicamento, pacienteId);

  return prisma.seguimientoMedicamento.upsert({
    where: {
      medicamentoId_pacienteId_fecha: {
        medicamentoId,
        pacienteId,
        fecha,
      },
    },
    update: { estado },
    create: {
      medicamentoId,
      pacienteId,
      fecha,
      estado,
    },
  });
};

export const createMedicamentoPacienteService = async ({
  pacienteId,
  nombre,
  dosis,
  instrucciones,
}) => {
  return prisma.medicamentos.create({
    data: {
      nombre,
      dosis,
      instrucciones,
      pacienteId,
    },
  });
};

export const updateMedicamentoPacienteService = async ({
  pacienteId,
  id,
  data,
}) => {
  const medicamento = await prisma.medicamentos.findUnique({ where: { id } });
  ensureMedicamentoPertenecePaciente(medicamento, pacienteId);

  return prisma.medicamentos.update({
    where: { id },
    data,
  });
};

export const deleteMedicamentoPacienteService = async (id) => {
  try {
    return await prisma.medicamentos.update({
      where: { id },
      data: { activo: false },
    });
  } catch (err) {
    if (err.code === "P2025") {
      throw new NotFoundError("Medicamento no encontrado.");
    }
    throw err;
  }
};
