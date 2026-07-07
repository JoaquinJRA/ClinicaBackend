import { prisma } from "../../../prisma/client.js";
import { NotFoundError } from "../../utils/appError.js";
import { calcularEdad } from "../../utils/medical.js";

const buildPacienteSearchFilter = (q, terms) => {
  const termFilter = (term) => ({
    OR: [
      { dni: { contains: term } },
      {
        usuario: {
          OR: [
            { nombre: { contains: term, mode: "insensitive" } },
            { apellido: { contains: term, mode: "insensitive" } },
          ],
        },
      },
    ],
  });

  return {
    OR: [
      { dni: { contains: q } },
      {
        usuario: {
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { apellido: { contains: q, mode: "insensitive" } },
          ],
        },
      },
      ...(terms.length > 1
        ? [
            {
              AND: terms.map(termFilter),
            },
          ]
        : []),
    ],
  };
};

export const buscarPacientesService = async (q) => {
  const query = String(q || "").trim();
  if (!query) return [];
  const terms = query.split(/\s+/).filter(Boolean);

  const pacientes = await prisma.paciente.findMany({
    where: buildPacienteSearchFilter(query, terms),
    include: { usuario: { select: { nombre: true, apellido: true } } },
    take: 10,
  });

  return pacientes.map((paciente) => ({
    id: paciente.id,
    codigo: `CL-${paciente.id}`,
    dni: paciente.dni,
    nombre: paciente.usuario.nombre,
    apellido: paciente.usuario.apellido,
  }));
};

export const getPerfilMedicoPacienteService = async (pacienteId) => {
  const paciente = await prisma.paciente.findUnique({
    where: { id: pacienteId },
    include: {
      usuario: { select: { nombre: true, apellido: true } },
      alergias: true,
      historialMedico: true,
    },
  });

  if (!paciente) throw new NotFoundError("Paciente no encontrado.");

  return {
    nombre: paciente.usuario.nombre,
    apellido: paciente.usuario.apellido,
    codigo: `CL-${paciente.id}`,
    dni: paciente.dni,
    edad: calcularEdad(paciente.fechaNacimiento),
    genero: paciente.genero,
    peso: paciente.peso,
    altura: paciente.altura,
    grupoSanguineo: paciente.grupoSanguineo,
    alergias: paciente.alergias.map((alergia) => ({
      id: alergia.id,
      nombre: alergia.nombre,
      severidad: alergia.severidad,
    })),
  };
};
