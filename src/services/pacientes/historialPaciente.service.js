import { prisma } from "../../../prisma/client.js";
import { NotFoundError } from "../../utils/appError.js";

export const getHistorialClinicoPacienteService = async (pacienteId) => {
  const paciente = await prisma.paciente.findUnique({
    where: { id: pacienteId },
    select: { id: true },
  });
  if (!paciente) throw new NotFoundError("Paciente no encontrado.");

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
        include: {
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
    fecha: consulta.cita?.fecha ?? consulta.creadoEn,
    motivo:
      consulta.motivo ??
      consulta.cita?.motivo ??
      consulta.notas ??
      "Consulta medica",
    sintomas: consulta.sintomas,
    diagnostico: consulta.diagnostico,
    tratamiento: consulta.tratamiento,
    notas: consulta.notas,
    receta: consulta.recetas.length
      ? consulta.recetas.map((receta) => receta.descripcion).join("\n")
      : null,
    doctor: consulta.cita
      ? `${consulta.cita.medico.usuario.nombre} ${consulta.cita.medico.usuario.apellido}`
      : consulta.medico
        ? `${consulta.medico.usuario.nombre} ${consulta.medico.usuario.apellido}`
        : "Clinica Luz",
    especialidad:
      consulta.cita?.medico.especialidad.nombre ??
      consulta.medico?.especialidad.nombre ??
      "General",
  }));
};
