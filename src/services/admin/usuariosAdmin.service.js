import bcrypt from "bcrypt";
import { prisma } from "../../../prisma/client.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../utils/appError.js";
import { toPositiveId } from "../../utils/request.js";
import {
  normalizeAlergias,
  normalizeMedicamentos,
} from "../../validators/admin.validator.js";
import {
  registrarAuditoriaSeguro,
  sanitize,
} from "./auditoriaAdmin.service.js";

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

const getRol = async (nombre) => {
  const rol = await prisma.rol.findUnique({ where: { nombre } });
  if (!rol) throw new BadRequestError("Rol invalido.");
  return rol;
};

export const getUsuariosAdminService = async ({ rol, query, estadoUsuario }) => {
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

  return sanitize(usuarios);
};

export const createUsuarioAdminService = async (req) => {
  const { nombre, apellido, email, contrasena, rol } = req.body;
  const rolDb = await getRol(rol);
  const contrasenaHash = await bcrypt.hash(contrasena, 10);

  try {
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
            especialidadId: toPositiveId(
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

    return sanitize(usuario);
  } catch (err) {
    if (err.code === "P2002") {
      throw new BadRequestError("Email, DNI o colegiatura duplicados.");
    }
    throw err;
  }
};

export const updateUsuarioAdminService = async ({
  req,
  id,
  usuarioData,
  pacienteData,
  medicoData,
}) => {
  const actual = await prisma.usuario.findUnique({
    where: { id },
    include: { rol: true, paciente: true, medico: true },
  });
  if (!actual) throw new NotFoundError("Usuario no encontrado.");

  if (req.body.contrasena) {
    usuarioData.contrasena = await bcrypt.hash(req.body.contrasena, 10);
  }
  if (pacienteData.fechaNacimiento) {
    pacienteData.fechaNacimiento = new Date(pacienteData.fechaNacimiento);
  }
  if (medicoData.especialidadId) {
    medicoData.especialidadId = toPositiveId(
      medicoData.especialidadId,
      "especialidadId",
    );
  }

  try {
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
      if (
        actual.paciente &&
        Object.prototype.hasOwnProperty.call(req.body, "notasGenerales")
      ) {
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

    return sanitize(usuario);
  } catch (err) {
    if (err.code === "P2002") {
      throw new BadRequestError("Email, DNI o colegiatura duplicados.");
    }
    throw err;
  }
};

export const updateEstadoUsuarioAdminService = async ({ req, id, estado }) => {
  try {
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

    return sanitize(usuario);
  } catch (err) {
    if (err.code === "P2025") {
      throw new NotFoundError("Usuario no encontrado.");
    }
    throw err;
  }
};

export const deleteUsuarioAdminService = async ({ req, id }) => {
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

  return sanitize(actualizado);
};
