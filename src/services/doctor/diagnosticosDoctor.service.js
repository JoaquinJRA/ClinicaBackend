import { prisma } from "../../../prisma/client.js";
import { NotFoundError } from "../../utils/appError.js";
import { formatPrescripcion } from "../../utils/medical.js";
import { getMedicamentosValidos } from "../../validators/doctor.validator.js";
import { createMedicamentosPrescritos } from "./prescripcionesDoctor.service.js";

export const getDiagnosticosPacienteService = async (pacienteId) => {
  const consultas = await prisma.consulta.findMany({
    where: { historialMedico: { pacienteId } },
    include: {
      recetas: { orderBy: { creadoEn: "asc" } },
      medico: {
        include: {
          usuario: { select: { nombre: true, apellido: true } },
          especialidad: true,
        },
      },
      cita: {
        select: {
          fecha: true,
          motivo: true,
          medico: {
            include: {
              usuario: { select: { nombre: true, apellido: true } },
              especialidad: true,
            },
          },
        },
      },
    },
    orderBy: { creadoEn: "desc" },
  });

  return consultas.map((consulta) => ({
    id: consulta.id,
    creadoEn: consulta.creadoEn,
    motivo: consulta.motivo ?? consulta.cita?.motivo,
    sintomas: consulta.sintomas,
    diagnostico: consulta.diagnostico,
    tratamiento: consulta.tratamiento,
    notas: consulta.notas,
    receta: consulta.recetas.length
      ? consulta.recetas.map((receta) => receta.descripcion).join("\n")
      : null,
    medico: consulta.cita
      ? `Dr./Dra. ${consulta.cita.medico.usuario.nombre} ${consulta.cita.medico.usuario.apellido}`
      : consulta.medico
        ? `Dr./Dra. ${consulta.medico.usuario.nombre} ${consulta.medico.usuario.apellido}`
        : "Dr./Dra. Clinica Luz",
    especialidad:
      consulta.medico?.especialidad.nombre ??
      consulta.cita?.medico?.especialidad?.nombre ??
      "General",
  }));
};

export const createDiagnosticoService = async ({
  userId,
  pacienteId,
  citaId,
  motivo,
  sintomas,
  diagnostico,
  tratamiento,
  notas,
  medicamentos,
}) => {
  try {
    const medico = await prisma.medico.findUnique({
      where: { usuarioId: userId },
    });
    if (!medico) throw new NotFoundError("Medico no encontrado.");

    const historial = await prisma.historialMedico.upsert({
      where: { pacienteId },
      update: {},
      create: { pacienteId, notasGenerales: "" },
    });

    const medicamentosValidos = getMedicamentosValidos(medicamentos);

    return await prisma.$transaction(async (tx) => {
      const consulta = await tx.consulta.create({
        data: {
          motivo,
          sintomas,
          diagnostico,
          tratamiento,
          notas,
          historialMedicoId: historial.id,
          medicoId: medico.id,
          ...(citaId && { citaId }),
          ...(medicamentosValidos.length && {
            recetas: {
              create: medicamentosValidos.map((medicamento) => ({
                descripcion: formatPrescripcion(medicamento),
              })),
            },
          }),
        },
        include: { recetas: true },
      });

      await createMedicamentosPrescritos({
        tx,
        pacienteId,
        medicamentos: medicamentosValidos,
      });

      return consulta;
    });
  } catch (err) {
    if (err.code === "P2025") {
      throw new NotFoundError("Paciente o cita no encontrada.");
    }
    throw err;
  }
};
