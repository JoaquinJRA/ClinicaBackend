import { prisma } from "../../../prisma/client.js";
import { NotFoundError } from "../../utils/appError.js";
import { calcularDiasRestantes } from "../../utils/medical.js";

const buildMedicamentoData = (medicamento, pacienteId) => ({
  nombre: medicamento.nombre,
  dosis: medicamento.dosis,
  frecuencia: medicamento.frecuencia,
  fechaInicio: medicamento.fechaInicio ? new Date(medicamento.fechaInicio) : null,
  duracion: medicamento.duracion,
  unidadDuracion: medicamento.unidadDuracion,
  diasRestantes: calcularDiasRestantes(
    medicamento.duracion,
    medicamento.unidadDuracion,
  ),
  instrucciones: medicamento.instrucciones ?? "",
  activo: true,
  pacienteId,
});

export const getPrescripcionesActivasService = async (pacienteId) => {
  const medicamentos = await prisma.medicamentos.findMany({
    where: { pacienteId, activo: true },
    orderBy: { creadoEn: "desc" },
  });

  return medicamentos.map((medicamento) => ({
    id: medicamento.id,
    nombre: medicamento.nombre,
    dosis: medicamento.dosis,
    frecuencia: medicamento.frecuencia,
    instrucciones: medicamento.instrucciones,
    fechaInicio: medicamento.fechaInicio,
    duracion: medicamento.duracion,
    unidadDuracion: medicamento.unidadDuracion,
    diasRestantes: medicamento.diasRestantes,
    creadoEn: medicamento.creadoEn,
  }));
};

export const createPrescripcionesService = async ({
  pacienteId,
  medicamentos,
}) => {
  const resultado = await prisma.$transaction(async (tx) => {
    const creados = [];

    for (const medicamento of medicamentos) {
      const creado = await tx.medicamentos.create({
        data: buildMedicamentoData(medicamento, pacienteId),
      });
      creados.push(creado);
    }
    return { creados };
  });

  return {
    mensaje: "Prescripcion emitida",
    total: resultado.creados.length,
  };
};

export const deletePrescripcionService = async (id) => {
  try {
    return await prisma.medicamentos.update({
      where: { id },
      data: { activo: false },
    });
  } catch (err) {
    if (err.code === "P2025") {
      throw new NotFoundError("Prescripcion no encontrada.");
    }
    throw err;
  }
};

export const updatePrescripcionService = async (id, data) => {
  try {
    const {
      nombre,
      dosis,
      frecuencia,
      fechaInicio,
      duracion,
      unidadDuracion,
      instrucciones,
    } = data;

    return await prisma.medicamentos.update({
      where: { id },
      data: {
        nombre,
        dosis,
        frecuencia,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        duracion,
        unidadDuracion,
        diasRestantes: calcularDiasRestantes(duracion, unidadDuracion),
        instrucciones: instrucciones ?? "",
      },
    });
  } catch (err) {
    if (err.code === "P2025") {
      throw new NotFoundError("Prescripcion no encontrada.");
    }
    throw err;
  }
};

export const createMedicamentosPrescritos = async ({
  tx,
  pacienteId,
  medicamentos,
}) => {
  for (const medicamento of medicamentos) {
    await tx.medicamentos.create({
      data: buildMedicamentoData(medicamento, pacienteId),
    });
  }
};
