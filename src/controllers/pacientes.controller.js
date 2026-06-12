import { prisma } from "../../prisma/client.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/appError.js";

const SEVERIDADES_VALIDAS = ["SEVERO", "MODERADO", "LEVE"];
const CAMPOS_PERFIL_PERMITIDOS = [
  "grupoSanguineo",
  "peso",
  "altura",
  "presionArterial",
  "telefono",
  "direccion",
];
const CAMPOS_MEDICAMENTO_PERMITIDOS = [
  "nombre",
  "dosis",
  "instrucciones",
  "activo",
];
const ESTADOS_SEGUIMIENTO = ["TOMADO", "SALTADO"];

const toId = (value, field = "id") => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestError(`${field} invalido.`);
  }
  return id;
};

const pickAllowed = (body, allowedFields) => {
  return allowedFields.reduce((data, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = body[field];
    }
    return data;
  }, {});
};

const getInicioDiaLocal = (value = new Date()) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError("Fecha invalida.");
  }

  date.setHours(0, 0, 0, 0);
  return date;
};

export const getPerfilPaciente = async (req, res, next) => {
  try {
    const id = toId(req.params.id);

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

    return res.status(200).json(paciente);
  } catch (err) {
    next(err);
  }
};

export const updatePerfilPaciente = async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    const data = pickAllowed(req.body, CAMPOS_PERFIL_PERMITIDOS);

    const paciente = await prisma.paciente.update({
      where: { id },
      data,
    });

    return res.status(200).json(paciente);
  } catch (err) {
    if (err.code === "P2025") {
      return next(new NotFoundError("Paciente no encontrado."));
    }
    next(err);
  }
};

export const getAlergiasPaciente = async (req, res, next) => {
  try {
    const pacienteId = toId(req.params.id);

    const alergias = await prisma.alergias.findMany({
      where: { pacienteId },
      orderBy: { creadoEn: "desc" },
    });

    return res.status(200).json(alergias);
  } catch (err) {
    next(err);
  }
};

export const createAlergiaPaciente = async (req, res, next) => {
  try {
    const pacienteId = toId(req.params.id);
    const { nombre, severidad } = req.body;

    if (!SEVERIDADES_VALIDAS.includes(severidad)) {
      throw new BadRequestError("Severidad invalida.");
    }

    const alergia = await prisma.alergias.create({
      data: {
        nombre,
        severidad,
        pacienteId,
      },
    });

    return res.status(201).json(alergia);
  } catch (err) {
    next(err);
  }
};

export const deleteAlergiaPaciente = async (req, res, next) => {
  try {
    const pacienteId = toId(req.params.id);
    const id = toId(req.params.aid, "aid");

    const alergia = await prisma.alergias.findUnique({ where: { id } });
    if (!alergia) throw new NotFoundError("Alergia no encontrada.");
    if (alergia.pacienteId !== pacienteId) {
      throw new ForbiddenError("La alergia no pertenece al paciente.");
    }

    await prisma.alergias.delete({ where: { id } });

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const getMedicamentosPaciente = async (req, res, next) => {
  try {
    const pacienteId = toId(req.params.id);
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

    return res.status(200).json(
      medicamentos.map((medicamento) => {
        const seguimientoHoy = medicamento.seguimientos[0] ?? null;
        const { seguimientos, ...data } = medicamento;

        return {
          ...data,
          seguimientoHoy,
        };
      }),
    );
  } catch (err) {
    next(err);
  }
};

export const marcarSeguimientoMedicamento = async (req, res, next) => {
  try {
    const pacienteId = toId(req.params.id);
    const medicamentoId = toId(req.params.mid, "mid");
    const estado = String(req.body.estado || "").toUpperCase();
    const fecha = getInicioDiaLocal(req.body.fecha ?? new Date());

    if (!ESTADOS_SEGUIMIENTO.includes(estado)) {
      throw new BadRequestError("Estado de seguimiento invalido.");
    }

    const medicamento = await prisma.medicamentos.findUnique({
      where: { id: medicamentoId },
    });
    if (!medicamento) throw new NotFoundError("Medicamento no encontrado.");
    if (medicamento.pacienteId !== pacienteId) {
      throw new ForbiddenError("El medicamento no pertenece al paciente.");
    }

    const seguimiento = await prisma.seguimientoMedicamento.upsert({
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

    return res.status(200).json(seguimiento);
  } catch (err) {
    next(err);
  }
};

export const getHistorialClinicoPaciente = async (req, res, next) => {
  try {
    const pacienteId = toId(req.params.id);

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

    return res.status(200).json(
      consultas.map((consulta) => ({
        id: consulta.id,
        fecha: consulta.cita?.fecha ?? consulta.creadoEn,
        motivo: consulta.motivo ?? consulta.cita?.motivo ?? consulta.notas ?? "Consulta medica",
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
      })),
    );
  } catch (err) {
    next(err);
  }
};

export const createMedicamentoPaciente = async (req, res, next) => {
  try {
    const pacienteId = toId(req.params.id);
    const { nombre, dosis, instrucciones } = req.body;

    const medicamento = await prisma.medicamentos.create({
      data: {
        nombre,
        dosis,
        instrucciones,
        pacienteId,
      },
    });

    return res.status(201).json(medicamento);
  } catch (err) {
    next(err);
  }
};

export const updateMedicamentoPaciente = async (req, res, next) => {
  try {
    const pacienteId = toId(req.params.id);
    const id = toId(req.params.mid, "mid");
    const data = pickAllowed(req.body, CAMPOS_MEDICAMENTO_PERMITIDOS);

    const medicamento = await prisma.medicamentos.findUnique({ where: { id } });
    if (!medicamento) throw new NotFoundError("Medicamento no encontrado.");
    if (medicamento.pacienteId !== pacienteId) {
      throw new ForbiddenError("El medicamento no pertenece al paciente.");
    }

    const actualizado = await prisma.medicamentos.update({
      where: { id },
      data,
    });

    return res.status(200).json(actualizado);
  } catch (err) {
    next(err);
  }
};

export const deleteMedicamentoPaciente = async (req, res, next) => {
  try {
    const id = toId(req.params.mid, "mid");

    const medicamento = await prisma.medicamentos.update({
      where: { id },
      data: { activo: false },
    });

    return res.status(200).json(medicamento);
  } catch (err) {
    if (err.code === "P2025") {
      return next(new NotFoundError("Medicamento no encontrado."));
    }
    next(err);
  }
};
