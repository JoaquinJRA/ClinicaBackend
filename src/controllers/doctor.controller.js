import { prisma } from "../../prisma/client.js";
import { BadRequestError, NotFoundError } from "../utils/appError.js";

const ESTADOS_CITA = ["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"];

const toPositiveInt = (value, field = "id") => {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new BadRequestError(`${field} invalido.`);
  }
  return number;
};

const parseFechaDia = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    throw new BadRequestError("Fecha invalida.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestError("Fecha invalida.");
  }

  return date;
};

const inicioDia = (value) => {
  const date = parseFechaDia(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const finDia = (value) => {
  const date = parseFechaDia(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
};

const parseFechaCita = (value) => {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value,
  );

  if (match) {
    const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw = "00"] =
      match;
    return new Date(
      Date.UTC(
        Number(yearRaw),
        Number(monthRaw) - 1,
        Number(dayRaw),
        Number(hourRaw),
        Number(minuteRaw),
        Number(secondRaw),
        0,
      ),
    );
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError("nuevaFecha invalida.");
  }
  return date;
};

const formatHora = (date) => {
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
};

const formatCitaDoctor = (cita) => ({
  id: cita.id,
  fecha: cita.fecha,
  hora: formatHora(cita.fecha),
  estado: cita.estado,
  motivo: cita.motivo,
  paciente: {
    nombre: cita.paciente.usuario.nombre,
    apellido: cita.paciente.usuario.apellido,
    codigo: `CL-${cita.paciente.id}`,
  },
});

const calcularDiasRestantes = (duracion, unidadDuracion) => {
  const cantidad = Number(duracion);
  if (!Number.isInteger(cantidad) || cantidad <= 0) return null;

  const unidad = String(unidadDuracion || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (unidad === "dias") return cantidad;
  if (unidad === "semanas") return cantidad * 7;
  if (unidad === "meses") return cantidad * 30;
  return null;
};

const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return null;

  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getUTCFullYear();
  const mes = hoy.getMonth() - fechaNacimiento.getUTCMonth();

  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getUTCDate())) {
    edad -= 1;
  }

  return edad;
};

const formatPrescripcion = (medicamento) => {
  const partes = [
    `${medicamento.nombre} ${medicamento.dosis}`,
    medicamento.frecuencia,
    medicamento.fechaInicio ? `Inicio: ${medicamento.fechaInicio}` : null,
    medicamento.duracion && medicamento.unidadDuracion
      ? `Duracion: ${medicamento.duracion} ${medicamento.unidadDuracion}`
      : null,
    medicamento.instrucciones,
  ].filter(Boolean);

  return partes.join(" | ");
};

export const getCitasDoctor = async (req, res, next) => {
  try {
    const medicoId = toPositiveInt(req.params.medicoId, "medicoId");
    const { estado, fecha } = req.query;

    if (estado && !ESTADOS_CITA.includes(estado)) {
      throw new BadRequestError("Estado invalido.");
    }

    const citas = await prisma.cita.findMany({
      where: {
        medicoId,
        ...(estado && { estado }),
        ...(fecha && { fecha: { gte: inicioDia(fecha), lte: finDia(fecha) } }),
      },
      include: {
        paciente: {
          include: { usuario: { select: { nombre: true, apellido: true } } },
        },
      },
      orderBy: { fecha: "asc" },
    });

    return res.status(200).json(citas.map(formatCitaDoctor));
  } catch (err) {
    next(err);
  }
};

export const updateEstadoCitaDoctor = async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    const { estado, nuevaFecha } = req.body;

    if (!ESTADOS_CITA.includes(estado)) {
      throw new BadRequestError("Estado invalido.");
    }

    const cita = await prisma.cita.update({
      where: { id },
      data: {
        estado,
        ...(nuevaFecha && { fecha: parseFechaCita(nuevaFecha) }),
      },
    });

    return res.status(200).json(cita);
  } catch (err) {
    if (err.code === "P2025") {
      return next(new NotFoundError("Cita no encontrada."));
    }
    next(err);
  }
};

export const buscarPacientes = async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(200).json([]);
    const terms = q.split(/\s+/).filter(Boolean);

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

    const pacientes = await prisma.paciente.findMany({
      where: {
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
      },
      include: { usuario: { select: { nombre: true, apellido: true } } },
      take: 10,
    });

    return res.status(200).json(
      pacientes.map((paciente) => ({
        id: paciente.id,
        codigo: `CL-${paciente.id}`,
        dni: paciente.dni,
        nombre: paciente.usuario.nombre,
        apellido: paciente.usuario.apellido,
      })),
    );
  } catch (err) {
    next(err);
  }
};

export const getPrescripcionesActivas = async (req, res, next) => {
  try {
    const pacienteId = toPositiveInt(req.params.pacienteId, "pacienteId");

    const medicamentos = await prisma.medicamentos.findMany({
      where: { pacienteId, activo: true },
      orderBy: { creadoEn: "desc" },
    });

    return res.status(200).json(
      medicamentos.map((medicamento) => ({
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
      })),
    );
  } catch (err) {
    next(err);
  }
};

export const createPrescripciones = async (req, res, next) => {
  try {
    const pacienteId = toPositiveInt(req.params.pacienteId, "pacienteId");
    const { medicamentos } = req.body;

    if (!Array.isArray(medicamentos) || medicamentos.length === 0) {
      throw new BadRequestError("Debe enviar al menos un medicamento.");
    }

    const medico = await prisma.medico.findUnique({
      where: { usuarioId: req.user.id },
      include: {
        usuario: { select: { nombre: true, apellido: true } },
        especialidad: true,
      },
    });
    if (!medico) throw new NotFoundError("Medico no encontrado.");

    const historial = await prisma.historialMedico.upsert({
      where: { pacienteId },
      update: {},
      create: { pacienteId, notasGenerales: "" },
    });

    const resultado = await prisma.$transaction(async (tx) => {
      const creados = [];

      for (const medicamento of medicamentos) {
        const diasRestantes = calcularDiasRestantes(
          medicamento.duracion,
          medicamento.unidadDuracion,
        );

        const creado = await tx.medicamentos.create({
          data: {
            nombre: medicamento.nombre,
            dosis: medicamento.dosis,
            frecuencia: medicamento.frecuencia,
            fechaInicio: medicamento.fechaInicio
              ? new Date(medicamento.fechaInicio)
              : null,
            duracion: medicamento.duracion,
            unidadDuracion: medicamento.unidadDuracion,
            diasRestantes,
            instrucciones: medicamento.instrucciones,
            activo: true,
            pacienteId,
          },
        });
        creados.push(creado);
      }

      const consulta = await tx.consulta.create({
        data: {
          diagnostico: "Prescripcion medica",
          tratamiento: medicamentos.map(formatPrescripcion).join("\n"),
          notas: `Prescripcion emitida por Dr./Dra. ${medico.usuario.nombre} ${medico.usuario.apellido}`,
          historialMedicoId: historial.id,
          medicoId: medico.id,
          recetas: {
            create: medicamentos.map((medicamento) => ({
              descripcion: formatPrescripcion(medicamento),
            })),
          },
        },
        include: { recetas: true },
      });

      return { creados, consulta };
    });

    return res.status(201).json({
      mensaje: "Prescripcion emitida",
      total: resultado.creados.length,
      consultaId: resultado.consulta.id,
    });
  } catch (err) {
    next(err);
  }
};

export const deletePrescripcion = async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.medId, "medId");

    const medicamento = await prisma.medicamentos.update({
      where: { id },
      data: { activo: false },
    });

    return res.status(200).json(medicamento);
  } catch (err) {
    if (err.code === "P2025") {
      return next(new NotFoundError("Prescripcion no encontrada."));
    }
    next(err);
  }
};

export const getDiagnosticosPaciente = async (req, res, next) => {
  try {
    const pacienteId = toPositiveInt(req.params.pacienteId, "pacienteId");

    const consultas = await prisma.consulta.findMany({
      where: { historialMedico: { pacienteId } },
      include: {
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

    return res.status(200).json(
      consultas.map((consulta) => ({
        id: consulta.id,
        creadoEn: consulta.creadoEn,
        motivo: consulta.motivo ?? consulta.cita?.motivo,
        sintomas: consulta.sintomas,
        diagnostico: consulta.diagnostico,
        tratamiento: consulta.tratamiento,
        notas: consulta.notas,
        medico: consulta.cita
          ? `Dr./Dra. ${consulta.cita.medico.usuario.nombre} ${consulta.cita.medico.usuario.apellido}`
          : consulta.medico
            ? `Dr./Dra. ${consulta.medico.usuario.nombre} ${consulta.medico.usuario.apellido}`
            : "Dr./Dra. Clinica Luz",
        especialidad:
          consulta.medico?.especialidad.nombre ??
          consulta.cita?.medico?.especialidad?.nombre ??
          "General",
      })),
    );
  } catch (err) {
    next(err);
  }
};

export const getPerfilMedicoPaciente = async (req, res, next) => {
  try {
    const pacienteId = toPositiveInt(req.params.pacienteId, "pacienteId");

    const paciente = await prisma.paciente.findUnique({
      where: { id: pacienteId },
      include: {
        usuario: { select: { nombre: true, apellido: true } },
        alergias: true,
        historialMedico: true,
      },
    });

    if (!paciente) throw new NotFoundError("Paciente no encontrado.");

    return res.status(200).json({
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
    });
  } catch (err) {
    next(err);
  }
};

export const createDiagnostico = async (req, res, next) => {
  try {
    const pacienteId = toPositiveInt(req.body.pacienteId, "pacienteId");
    const { citaId, motivo, sintomas, diagnostico, tratamiento, notas } = req.body;

    if (!diagnostico) {
      throw new BadRequestError("El diagnostico es requerido.");
    }

    const medico = await prisma.medico.findUnique({
      where: { usuarioId: req.user.id },
    });
    if (!medico) throw new NotFoundError("Medico no encontrado.");

    const historial = await prisma.historialMedico.upsert({
      where: { pacienteId },
      update: {},
      create: { pacienteId, notasGenerales: "" },
    });

    const consulta = await prisma.consulta.create({
      data: {
        motivo,
        sintomas,
        diagnostico,
        tratamiento,
        notas,
        historialMedicoId: historial.id,
        medicoId: medico.id,
        ...(citaId && { citaId: toPositiveInt(citaId, "citaId") }),
      },
    });

    return res.status(201).json(consulta);
  } catch (err) {
    if (err.code === "P2025") {
      return next(new NotFoundError("Paciente o cita no encontrada."));
    }
    next(err);
  }
};
