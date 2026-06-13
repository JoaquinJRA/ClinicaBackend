import bcrypt from "bcrypt";
import { prisma } from "../../prisma/client.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../utils/appError.js";

const ESTADOS_USUARIO = ["ACTIVO", "INACTIVO"];
const ESTADOS_CITA = ["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"];
const ESTADOS_PAGO = ["PENDIENTE", "PAGADO", "FALLIDO"];
const SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
];
const COSTOS_ESPECIALIDAD = {
  "Medicina General": 120,
  Cardiologia: 200,
  Cardiología: 200,
  Pediatria: 150,
  Pediatría: 150,
  Dermatologia: 180,
  Dermatología: 180,
};

const toPositiveInt = (value, field = "id") => {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new BadRequestError(`${field} invalido.`);
  }
  return number;
};

const pick = (body, fields) =>
  fields.reduce((data, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = body[field];
    }
    return data;
  }, {});

const buildSlotDate = (fecha, hora) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || "")) {
    throw new BadRequestError("Fecha invalida.");
  }
  if (!SLOTS.includes(hora)) {
    throw new BadRequestError("Hora no valida.");
  }

  const [year, month, day] = fecha.split("-").map(Number);
  const [hour, minute] = hora.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
};

const dayRange = (fecha) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || "")) {
    throw new BadRequestError("Fecha invalida.");
  }
  const [year, month, day] = fecha.split("-").map(Number);
  return {
    gte: new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)),
    lte: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)),
  };
};

const monthRange = (year, month) => {
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  if (
    !Number.isInteger(parsedYear) ||
    !Number.isInteger(parsedMonth) ||
    parsedMonth < 1 ||
    parsedMonth > 12
  ) {
    throw new BadRequestError("Mes o año invalido.");
  }

  return {
    inicio: new Date(Date.UTC(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0)),
    fin: new Date(Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59, 999)),
    dias: new Date(Date.UTC(parsedYear, parsedMonth, 0)).getUTCDate(),
    year: parsedYear,
    month: parsedMonth,
  };
};

const getCostoEspecialidad = (nombre) => COSTOS_ESPECIALIDAD[nombre] ?? 100;

const SEVERIDADES_ALERGIA = ["SEVERO", "MODERADO", "LEVE"];

const normalizeAlergias = (items) =>
  Array.isArray(items)
    ? items
        .map((alergia) => ({
          nombre: String(alergia.nombre || "").trim(),
          severidad: SEVERIDADES_ALERGIA.includes(alergia.severidad)
            ? alergia.severidad
            : "LEVE",
        }))
        .filter((alergia) => alergia.nombre)
    : [];

const normalizeMedicamentos = (items) =>
  Array.isArray(items)
    ? items
        .map((medicamento) => ({
          nombre: String(medicamento.nombre || "").trim(),
          dosis: String(medicamento.dosis || "").trim(),
          instrucciones: String(medicamento.instrucciones || "").trim(),
          frecuencia: medicamento.frecuencia
            ? String(medicamento.frecuencia).trim()
            : undefined,
          fechaInicio: medicamento.fechaInicio
            ? new Date(medicamento.fechaInicio)
            : undefined,
          duracion:
            medicamento.duracion === "" || medicamento.duracion === undefined
              ? undefined
              : Number(medicamento.duracion),
          unidadDuracion: medicamento.unidadDuracion
            ? String(medicamento.unidadDuracion).trim()
            : undefined,
          diasRestantes:
            medicamento.diasRestantes === "" ||
            medicamento.diasRestantes === undefined
              ? undefined
              : Number(medicamento.diasRestantes),
          activo:
            typeof medicamento.activo === "boolean" ? medicamento.activo : true,
        }))
        .filter((medicamento) => medicamento.nombre && medicamento.dosis)
    : [];

const sanitize = (value) => {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value instanceof Date) return value.toISOString();
  if (!value || typeof value !== "object") return value;

  return Object.entries(value).reduce((result, [key, entry]) => {
    if (key !== "contrasena") result[key] = sanitize(entry);
    return result;
  }, {});
};

const actorNombre = async (req) => {
  if (!req.user?.id) {
    return { usuarioId: null, usuarioNombre: "Sistema", rol: "SISTEMA" };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: Number(req.user.id) },
    include: { rol: true },
  });

  return {
    usuarioId: usuario?.id ?? Number(req.user.id),
    usuarioNombre: usuario
      ? `${usuario.nombre} ${usuario.apellido}`
      : `Usuario ${req.user.id}`,
    rol: usuario?.rol?.nombre ?? req.user.rol ?? "ADMIN",
  };
};

const registrarAuditoria = async (req, data, tx = prisma) => {
  const actor = await actorNombre(req);
  return tx.auditoria.create({
    data: {
      ...actor,
      accion: data.accion,
      modulo: data.modulo,
      entidad: data.entidad,
      entidadId: data.entidadId,
      detalle: data.detalle ? sanitize(data.detalle) : undefined,
      ip: req.ip || req.headers["x-forwarded-for"] || undefined,
    },
  });
};

const registrarAuditoriaSeguro = async (req, data) => {
  try {
    await registrarAuditoria(req, data);
  } catch (err) {
    console.error("No se pudo registrar auditoria:", err.message);
  }
};

const getRol = async (nombre) => {
  const rol = await prisma.rol.findUnique({ where: { nombre } });
  if (!rol) throw new BadRequestError("Rol invalido.");
  return rol;
};

const usuarioInclude = {
  rol: true,
  paciente: {
    include: {
      alergias: true,
      medicamentos: { where: { activo: true } },
      historialMedico: true,
    },
  },
  medico: { include: { especialidad: true } },
};

export const getAuditoriaAdmin = async (req, res, next) => {
  try {
    const { q, accion, modulo, fechaDesde, fechaHasta } = req.query;
    const query = String(q || "").trim();
    const creadoEn = {};
    if (fechaDesde) creadoEn.gte = new Date(`${fechaDesde}T00:00:00`);
    if (fechaHasta) creadoEn.lte = new Date(`${fechaHasta}T23:59:59`);

    const registros = await prisma.auditoria.findMany({
      where: {
        ...(accion && { accion: String(accion) }),
        ...(modulo && { modulo: String(modulo) }),
        ...(Object.keys(creadoEn).length && { creadoEn }),
        ...(query && {
          OR: [
            { usuarioNombre: { contains: query, mode: "insensitive" } },
            { accion: { contains: query, mode: "insensitive" } },
            { modulo: { contains: query, mode: "insensitive" } },
            { entidad: { contains: query, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { creadoEn: "desc" },
      take: 200,
    });

    return res.status(200).json(registros);
  } catch (err) {
    next(err);
  }
};

export const getUsuariosAdmin = async (req, res, next) => {
  try {
    const { rol, q, estado } = req.query;
    const query = String(q || "").trim();
    const estadoUsuario = estado ? String(estado) : undefined;
    if (estadoUsuario && !ESTADOS_USUARIO.includes(estadoUsuario)) {
      throw new BadRequestError("Estado invalido.");
    }

    const usuarios = await prisma.usuario.findMany({
      where: {
        ...(rol && { rol: { nombre: String(rol) } }),
        ...(estadoUsuario && { estado: estadoUsuario }),
        ...(query && {
          OR: [
            { nombre: { contains: query, mode: "insensitive" } },
            { apellido: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { paciente: { is: { dni: { contains: query } } } },
          ],
        }),
      },
      include: usuarioInclude,
      orderBy: { id: "asc" },
    });

    return res.status(200).json(sanitize(usuarios));
  } catch (err) {
    next(err);
  }
};

export const createUsuarioAdmin = async (req, res, next) => {
  try {
    const { nombre, apellido, email, contrasena, rol } = req.body;
    if (!nombre || !apellido || !email || !contrasena || !rol) {
      throw new BadRequestError("Faltan campos obligatorios.");
    }

    const rolDb = await getRol(rol);
    const contrasenaHash = await bcrypt.hash(contrasena, 10);

    const usuario = await prisma.$transaction(async (tx) => {
      const creado = await tx.usuario.create({
        data: {
          nombre,
          apellido,
          email,
          contrasena: contrasenaHash,
          estado: req.body.estado || "ACTIVO",
          rolId: rolDb.id,
          emailVerificado: true,
        },
      });

      if (rol === "PACIENTE") {
        const paciente = await tx.paciente.create({
          data: {
            dni: req.body.dni,
            telefono: req.body.telefono,
            direccion: req.body.direccion,
            fechaNacimiento: req.body.fechaNacimiento
              ? new Date(req.body.fechaNacimiento)
              : null,
            genero: req.body.genero || "OTRO",
            grupoSanguineo: req.body.grupoSanguineo,
            peso: req.body.peso,
            altura: req.body.altura,
            presionArterial: req.body.presionArterial,
            antecedentesMedicos: req.body.antecedentesMedicos,
            usuarioId: creado.id,
          },
        });

        const alergias = normalizeAlergias(req.body.alergias);
        if (alergias.length) {
          await tx.alergias.createMany({
            data: alergias.map((alergia) => ({
              ...alergia,
              pacienteId: paciente.id,
            })),
          });
        }

        const medicamentos = normalizeMedicamentos(req.body.medicamentos);
        if (medicamentos.length) {
          await tx.medicamentos.createMany({
            data: medicamentos.map((medicamento) => ({
              ...medicamento,
              pacienteId: paciente.id,
            })),
          });
        }

        await tx.historialMedico.create({
          data: {
            pacienteId: paciente.id,
            notasGenerales: req.body.notasGenerales || "",
          },
        });
      }

      if (rol === "MEDICO") {
        await tx.medico.create({
          data: {
            numeroColegiatura: req.body.numeroColegiatura,
            telefono: req.body.telefono,
            estado: req.body.estado || "ACTIVO",
            usuarioId: creado.id,
            especialidadId: toPositiveInt(
              req.body.especialidadId,
              "especialidadId",
            ),
          },
        });
      }

      return tx.usuario.findUnique({
        where: { id: creado.id },
        include: usuarioInclude,
      });
    });

    await registrarAuditoriaSeguro(req, {
      accion: "CREAR_USUARIO",
      modulo: "Usuarios",
      entidad: "Usuario",
      entidadId: usuario.id,
      detalle: {
        usuario: `${usuario.nombre} ${usuario.apellido}`,
        email: usuario.email,
        rol,
      },
    });

    return res.status(201).json(sanitize(usuario));
  } catch (err) {
    if (err.code === "P2002") {
      return next(new BadRequestError("Email, DNI o colegiatura duplicados."));
    }
    next(err);
  }
};

export const updateUsuarioAdmin = async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    const actual = await prisma.usuario.findUnique({
      where: { id },
      include: { rol: true, paciente: true, medico: true },
    });
    if (!actual) throw new NotFoundError("Usuario no encontrado.");

    const usuarioData = pick(req.body, [
      "nombre",
      "apellido",
      "email",
      "estado",
    ]);
    if (req.body.contrasena) {
      usuarioData.contrasena = await bcrypt.hash(req.body.contrasena, 10);
    }

    const pacienteData = pick(req.body, [
      "dni",
      "telefono",
      "direccion",
      "fechaNacimiento",
      "genero",
      "grupoSanguineo",
      "peso",
      "altura",
      "presionArterial",
      "antecedentesMedicos",
    ]);
    if (pacienteData.fechaNacimiento) {
      pacienteData.fechaNacimiento = new Date(pacienteData.fechaNacimiento);
    }

    const medicoData = pick(req.body, [
      "numeroColegiatura",
      "telefono",
      "estado",
      "especialidadId",
    ]);
    if (medicoData.especialidadId) {
      medicoData.especialidadId = toPositiveInt(
        medicoData.especialidadId,
        "especialidadId",
      );
    }

    const usuario = await prisma.$transaction(async (tx) => {
      if (Object.keys(usuarioData).length) {
        await tx.usuario.update({ where: { id }, data: usuarioData });
      }
      if (actual.paciente && Object.keys(pacienteData).length) {
        await tx.paciente.update({
          where: { id: actual.paciente.id },
          data: pacienteData,
        });
      }
      if (actual.paciente && Object.prototype.hasOwnProperty.call(req.body, "notasGenerales")) {
        await tx.historialMedico.upsert({
          where: { pacienteId: actual.paciente.id },
          update: { notasGenerales: req.body.notasGenerales || "" },
          create: {
            pacienteId: actual.paciente.id,
            notasGenerales: req.body.notasGenerales || "",
          },
        });
      }
      if (actual.paciente && Array.isArray(req.body.alergias)) {
        const alergias = normalizeAlergias(req.body.alergias);
        await tx.alergias.deleteMany({
          where: { pacienteId: actual.paciente.id },
        });
        if (alergias.length) {
          await tx.alergias.createMany({
            data: alergias.map((alergia) => ({
              ...alergia,
              pacienteId: actual.paciente.id,
            })),
          });
        }
      }
      if (actual.paciente && Array.isArray(req.body.medicamentos)) {
        const medicamentos = normalizeMedicamentos(req.body.medicamentos);
        await tx.medicamentos.updateMany({
          where: { pacienteId: actual.paciente.id, activo: true },
          data: { activo: false },
        });
        if (medicamentos.length) {
          await tx.medicamentos.createMany({
            data: medicamentos.map((medicamento) => ({
              ...medicamento,
              pacienteId: actual.paciente.id,
            })),
          });
        }
      }
      if (actual.medico && Object.keys(medicoData).length) {
        await tx.medico.update({
          where: { id: actual.medico.id },
          data: medicoData,
        });
      }
      return tx.usuario.findUnique({ where: { id }, include: usuarioInclude });
    });

    await registrarAuditoriaSeguro(req, {
      accion: "EDITAR_USUARIO",
      modulo: "Usuarios",
      entidad: "Usuario",
      entidadId: usuario.id,
      detalle: {
        usuario: `${usuario.nombre} ${usuario.apellido}`,
        email: usuario.email,
        campos: Object.keys(req.body).filter((campo) => campo !== "contrasena"),
      },
    });

    return res.status(200).json(sanitize(usuario));
  } catch (err) {
    if (err.code === "P2002") {
      return next(new BadRequestError("Email, DNI o colegiatura duplicados."));
    }
    next(err);
  }
};

export const updateEstadoUsuarioAdmin = async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    const { estado } = req.body;
    if (!ESTADOS_USUARIO.includes(estado)) {
      throw new BadRequestError("Estado invalido.");
    }

    const usuario = await prisma.$transaction(async (tx) => {
      const actualizado = await tx.usuario.update({
        where: { id },
        data: { estado },
        include: { medico: true },
      });
      if (actualizado.medico) {
        await tx.medico.update({
          where: { id: actualizado.medico.id },
          data: { estado },
        });
      }
      return tx.usuario.findUnique({ where: { id }, include: usuarioInclude });
    });

    await registrarAuditoriaSeguro(req, {
      accion: "CAMBIAR_ESTADO_USUARIO",
      modulo: "Usuarios",
      entidad: "Usuario",
      entidadId: usuario.id,
      detalle: {
        usuario: `${usuario.nombre} ${usuario.apellido}`,
        estado,
      },
    });

    return res.status(200).json(sanitize(usuario));
  } catch (err) {
    if (err.code === "P2025") {
      return next(new NotFoundError("Usuario no encontrado."));
    }
    next(err);
  }
};

export const deleteUsuarioAdmin = async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: { paciente: true, medico: true },
    });
    if (!usuario) throw new NotFoundError("Usuario no encontrado.");

    const filtrosCitas = [
      ...(usuario.paciente ? [{ pacienteId: usuario.paciente.id }] : []),
      ...(usuario.medico ? [{ medicoId: usuario.medico.id }] : []),
    ];
    const citasActivas = filtrosCitas.length
      ? await prisma.cita.count({
          where: {
            estado: { in: ["PENDIENTE", "CONFIRMADA"] },
            OR: filtrosCitas,
          },
        })
      : 0;

    if (citasActivas > 0) {
      throw new ConflictError("El usuario tiene citas pendientes o confirmadas.");
    }

    const actualizado = await prisma.usuario.update({
      where: { id },
      data: { estado: "INACTIVO" },
      include: usuarioInclude,
    });

    if (usuario.medico) {
      await prisma.medico.update({
        where: { id: usuario.medico.id },
        data: { estado: "INACTIVO" },
      });
    }

    await registrarAuditoriaSeguro(req, {
      accion: "ELIMINAR_USUARIO",
      modulo: "Usuarios",
      entidad: "Usuario",
      entidadId: actualizado.id,
      detalle: {
        usuario: `${actualizado.nombre} ${actualizado.apellido}`,
        email: actualizado.email,
        resultado: "INACTIVO",
      },
    });

    return res.status(200).json(sanitize(actualizado));
  } catch (err) {
    next(err);
  }
};

export const getEspecialidadesAdmin = async (_req, res, next) => {
  try {
    const especialidades = await prisma.especialidad.findMany({
      orderBy: { nombre: "asc" },
    });
    return res.status(200).json(especialidades);
  } catch (err) {
    next(err);
  }
};

export const getCitasAdmin = async (req, res, next) => {
  try {
    const { estado, fecha } = req.query;
    if (estado && !ESTADOS_CITA.includes(estado)) {
      throw new BadRequestError("Estado invalido.");
    }

    const citas = await prisma.cita.findMany({
      where: {
        ...(estado && { estado }),
        ...(fecha && { fecha: dayRange(fecha) }),
      },
      include: {
        paciente: { include: { usuario: true } },
        medico: { include: { usuario: true, especialidad: true } },
      },
      orderBy: { fecha: "desc" },
    });

    return res.status(200).json(sanitize(
      citas.map((cita) => ({
        ...cita,
        codigoCita: `CIT-${cita.id}`,
      })),
    ));
  } catch (err) {
    next(err);
  }
};

export const getOcupacionMedicaAdmin = async (req, res, next) => {
  try {
    const now = new Date();
    const { inicio, fin, dias, year, month } = monthRange(
      req.query.year || now.getUTCFullYear(),
      req.query.month || now.getUTCMonth() + 1,
    );

    const [especialidades, medicos, citas] = await Promise.all([
      prisma.especialidad.findMany({
        orderBy: { nombre: "asc" },
      }),
      prisma.medico.findMany({
        where: { estado: "ACTIVO" },
        include: { usuario: true, especialidad: true },
        orderBy: { id: "asc" },
      }),
      prisma.cita.findMany({
        where: {
          fecha: { gte: inicio, lte: fin },
          estado: { not: "CANCELADA" },
        },
        include: {
          medico: { include: { especialidad: true, usuario: true } },
        },
      }),
    ]);

    const fechaKey = (fecha) => fecha.toISOString().slice(0, 10);
    const slotKey = (fecha) =>
      `${String(fecha.getUTCHours()).padStart(2, "0")}:${String(
        fecha.getUTCMinutes(),
      ).padStart(2, "0")}`;

    const totalSlotsMes = medicos.length * SLOTS.length * dias;
    const diasData = Array.from({ length: dias }, (_, index) => {
      const fecha = new Date(Date.UTC(year, month - 1, index + 1));
      const key = fechaKey(fecha);
      const slotsOcupados = citas.filter((cita) => fechaKey(cita.fecha) === key)
        .length;
      const totalSlots = medicos.length * SLOTS.length;
      const ocupacion = totalSlots ? Math.round((slotsOcupados / totalSlots) * 100) : 0;

      return {
        fecha: key,
        slotsOcupados,
        totalSlots,
        ocupacion,
        demanda:
          ocupacion >= 70
            ? "ALTA"
            : ocupacion >= 35
              ? "MEDIA"
              : "BAJA",
      };
    });

    const horarios = SLOTS.map((hora) => {
      const total = citas.filter((cita) => slotKey(cita.fecha) === hora).length;
      const totalSlots = medicos.length * dias;
      return {
        hora,
        total,
        ocupacion: totalSlots ? Math.round((total / totalSlots) * 100) : 0,
      };
    }).sort((a, b) => b.total - a.total);

    const especialidadesData = especialidades.map((especialidad) => {
      const medicosEspecialidad = medicos.filter(
        (medico) => medico.especialidadId === especialidad.id,
      );
      const citasEspecialidad = citas.filter(
        (cita) => cita.medico.especialidadId === especialidad.id,
      );
      const totalSlots = medicosEspecialidad.length * SLOTS.length * dias;
      return {
        id: especialidad.id,
        nombre: especialidad.nombre,
        medicosActivos: medicosEspecialidad.length,
        citas: citasEspecialidad.length,
        totalSlots,
        ocupacion: totalSlots
          ? Math.round((citasEspecialidad.length / totalSlots) * 100)
          : 0,
        sinMedicos: medicosEspecialidad.length === 0,
      };
    });

    const medicosData = medicos.map((medico) => {
      const citasMedico = citas.filter((cita) => cita.medicoId === medico.id);
      const totalSlots = SLOTS.length * dias;
      const ocupacion = totalSlots
        ? Math.round((citasMedico.length / totalSlots) * 100)
        : 0;
      return {
        id: medico.id,
        nombre: `${medico.usuario.nombre} ${medico.usuario.apellido}`,
        especialidad: medico.especialidad.nombre,
        citas: citasMedico.length,
        totalSlots,
        ocupacion,
        pocosTurnos: citasMedico.length <= 2,
      };
    }).sort((a, b) => a.citas - b.citas);

    return res.status(200).json({
      periodo: { year, month, dias },
      resumen: {
        totalCitas: citas.length,
        totalMedicos: medicos.length,
        totalEspecialidades: especialidades.length,
        totalSlots: totalSlotsMes,
        ocupacionGeneral: totalSlotsMes
          ? Math.round((citas.length / totalSlotsMes) * 100)
          : 0,
        especialidadesSinMedicos: especialidadesData.filter((item) => item.sinMedicos),
        medicosConPocosTurnos: medicosData.filter((item) => item.pocosTurnos),
      },
      dias: diasData,
      horarios,
      especialidades: especialidadesData,
      medicos: medicosData,
    });
  } catch (err) {
    next(err);
  }
};

export const reprogramarCitaAdmin = async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    const { nuevaFecha, nuevaHora } = req.body;
    const medicoId = req.body.medicoId
      ? toPositiveInt(req.body.medicoId, "medicoId")
      : undefined;
    const fecha = buildSlotDate(nuevaFecha, nuevaHora);
    const citaActual = await prisma.cita.findUnique({ where: { id } });
    if (!citaActual) throw new NotFoundError("Cita no encontrada.");

    const nextMedicoId = medicoId || citaActual.medicoId;
    const ocupada = await prisma.cita.findFirst({
      where: {
        id: { not: id },
        medicoId: nextMedicoId,
        fecha,
        estado: { not: "CANCELADA" },
      },
    });
    if (ocupada) throw new ConflictError("Slot ocupado.");

    const cita = await prisma.cita.update({
      where: { id },
      data: { fecha, medicoId: nextMedicoId, estado: "PENDIENTE" },
    });

    await registrarAuditoriaSeguro(req, {
      accion: "REPROGRAMAR_CITA",
      modulo: "Citas",
      entidad: "Cita",
      entidadId: cita.id,
      detalle: {
        fecha: cita.fecha,
        medicoId: cita.medicoId,
        estado: cita.estado,
      },
    });

    return res.status(200).json(cita);
  } catch (err) {
    next(err);
  }
};

export const reasignarCitaAdmin = async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    const medicoId = toPositiveInt(req.body.medicoId, "medicoId");

    const cita = await prisma.cita.findUnique({
      where: { id },
      include: { medico: true },
    });
    if (!cita) throw new NotFoundError("Cita no encontrada.");

    const medico = await prisma.medico.findUnique({ where: { id: medicoId } });
    if (!medico) throw new NotFoundError("Medico no encontrado.");
    if (medico.especialidadId !== cita.medico.especialidadId) {
      throw new BadRequestError("El medico debe ser de la misma especialidad.");
    }

    const ocupada = await prisma.cita.findFirst({
      where: {
        id: { not: id },
        medicoId,
        fecha: cita.fecha,
        estado: { not: "CANCELADA" },
      },
    });
    if (ocupada) throw new ConflictError("Slot ocupado.");

    const actualizada = await prisma.cita.update({
      where: { id },
      data: { medicoId },
    });

    await registrarAuditoriaSeguro(req, {
      accion: "REASIGNAR_CITA",
      modulo: "Citas",
      entidad: "Cita",
      entidadId: actualizada.id,
      detalle: {
        medicoAnteriorId: cita.medicoId,
        medicoNuevoId: actualizada.medicoId,
        fecha: actualizada.fecha,
      },
    });

    return res.status(200).json(actualizada);
  } catch (err) {
    next(err);
  }
};

export const updateEstadoCitaAdmin = async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    const { estado } = req.body;
    if (!ESTADOS_CITA.includes(estado)) {
      throw new BadRequestError("Estado invalido.");
    }

    const cita = await prisma.cita.update({ where: { id }, data: { estado } });
    await registrarAuditoriaSeguro(req, {
      accion: "CAMBIAR_ESTADO_CITA",
      modulo: "Citas",
      entidad: "Cita",
      entidadId: cita.id,
      detalle: { estado, fecha: cita.fecha },
    });
    return res.status(200).json(cita);
  } catch (err) {
    if (err.code === "P2025") {
      return next(new NotFoundError("Cita no encontrada."));
    }
    next(err);
  }
};

export const getMedicosAdmin = async (req, res, next) => {
  try {
    const especialidadId = req.query.especialidadId
      ? toPositiveInt(req.query.especialidadId, "especialidadId")
      : undefined;
    const medicos = await prisma.medico.findMany({
      where: { estado: "ACTIVO", ...(especialidadId && { especialidadId }) },
      include: { usuario: true, especialidad: true },
      orderBy: { id: "asc" },
    });
    return res.status(200).json(sanitize(medicos));
  } catch (err) {
    next(err);
  }
};

export const getPagosResumenAdmin = async (_req, res, next) => {
  try {
    const [pagado, pagosPendientes, pagosCancelados] = await Promise.all([
      prisma.pago.aggregate({
        where: { estado: "PAGADO" },
        _sum: { monto: true },
      }),
      prisma.pago.count({ where: { estado: "PENDIENTE" } }),
      prisma.pago.count({ where: { estado: "FALLIDO" } }),
    ]);

    return res.status(200).json({
      totalRecaudado: Number(pagado._sum.monto || 0),
      pagosPendientes,
      pagosCancelados,
    });
  } catch (err) {
    next(err);
  }
};

export const getPagosAdmin = async (req, res, next) => {
  try {
    const { q, estado, fechaDesde, fechaHasta } = req.query;
    const query = String(q || "").trim();
    if (estado && !ESTADOS_PAGO.includes(estado)) {
      throw new BadRequestError("Estado invalido.");
    }

    const creadoEn = {};
    if (fechaDesde) creadoEn.gte = new Date(`${fechaDesde}T00:00:00`);
    if (fechaHasta) creadoEn.lte = new Date(`${fechaHasta}T23:59:59`);

    const pagos = await prisma.pago.findMany({
      where: {
        ...(estado && { estado }),
        ...(Object.keys(creadoEn).length && { creadoEn }),
        ...(query && {
          OR: [
            ...(Number.isInteger(Number(query))
              ? [{ citaId: Number(query) }]
              : []),
            {
              cita: {
                paciente: {
                  usuario: {
                    OR: [
                      { nombre: { contains: query, mode: "insensitive" } },
                      { apellido: { contains: query, mode: "insensitive" } },
                    ],
                  },
                },
              },
            },
          ],
        }),
      },
      include: {
        cita: {
          include: {
            paciente: { include: { usuario: true } },
            medico: { include: { usuario: true, especialidad: true } },
          },
        },
      },
      orderBy: { creadoEn: "desc" },
    });

    return res.status(200).json(sanitize(
      pagos.map((pago) => ({
        ...pago,
        monto: Number(pago.monto),
        costoEstandar: getCostoEspecialidad(
          pago.cita.medico.especialidad.nombre,
        ),
      })),
    ));
  } catch (err) {
    next(err);
  }
};

export const marcarPagoPagadoAdmin = async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    const pago = await prisma.pago.update({
      where: { id },
      data: { estado: "PAGADO" },
    });
    await registrarAuditoriaSeguro(req, {
      accion: "MARCAR_PAGO_PAGADO",
      modulo: "Pagos",
      entidad: "Pago",
      entidadId: pago.id,
      detalle: {
        citaId: pago.citaId,
        monto: Number(pago.monto),
        estado: "PAGADO",
      },
    });

    return res.status(200).json({ ...pago, monto: Number(pago.monto) });
  } catch (err) {
    if (err.code === "P2025") {
      return next(new NotFoundError("Pago no encontrado."));
    }
    next(err);
  }
};
