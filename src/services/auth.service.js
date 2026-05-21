import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from "../utils/appError.js";
import crypto from "crypto";
import { prisma } from "../../prisma/client.js";
import { sendVerificationEmail } from "../utils/email.js";

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

export const registerService = async (data) => {
  const {
    nombre,
    apellido,
    email,
    contrasena,
    dni,
    telefono,
    direccion,
    fechaNacimiento,
    genero,
  } = data;

  const existingUser = await prisma.usuario.findUnique({ where: { email } });
  if (existingUser) throw new ConflictError("El correo ya está registrado.");

  const existingPaciente = await prisma.paciente.findUnique({ where: { dni } });
  if (existingPaciente) throw new ConflictError("El DNI ya está registrado.");

  const rolPaciente = await prisma.rol.findUnique({
    where: { nombre: "PACIENTE" },
  });
  if (!rolPaciente)
    throw new BadRequestError("No existe el rol PACIENTE en la base de datos.");

  const contrasenaHash = await bcrypt.hash(contrasena, 10);

  // Token de verificación — cadena aleatoria con expiración de 24h
  const tokenVerificacion = crypto.randomBytes(32).toString("hex");
  const tokenVerificacionExp = new Date(Date.now() + 1000 * 60 * 60 * 24);

  const usuario = await prisma.usuario.create({
    data: {
      nombre,
      apellido,
      email,
      contrasena: contrasenaHash,
      rolId: rolPaciente.id,
      emailVerificado: false,
      tokenVerificacion,
      tokenVerificacionExp,

      paciente: {
        create: {
          dni,
          telefono,
          direccion,
          fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
          genero,
        },
      },
    },
    include: { rol: true, paciente: true },
  });

  // Envía el correo — no bloquea si falla
  await sendVerificationEmail(email, tokenVerificacion).catch((err) =>
    console.error("Error al enviar email de verificación:", err),
  );

  return {
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol.nombre,
    },
  };
};

export const loginService = async (email, contrasena) => {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    include: { rol: true },
  });

  if (!usuario) throw new UnauthorizedError("Correo o contraseña incorrectos.");

  const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);
  if (!contrasenaValida)
    throw new UnauthorizedError("Correo o contraseña incorrectos.");

  // Bloquea login si el email no está verificado
  if (!usuario.emailVerificado)
    throw new UnauthorizedError(
      "Debes verificar tu correo electrónico antes de iniciar sesión.",
    );

  const token = generateToken({ id: usuario.id, rol: usuario.rol.nombre });

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol.nombre,
    },
  };
};

export const verificarEmailService = async (token) => {
  const usuario = await prisma.usuario.findUnique({
    where: { tokenVerificacion: token },
  });

  if (!usuario) throw new BadRequestError("Token de verificación inválido.");

  if (usuario.emailVerificado)
    throw new BadRequestError("El correo ya fue verificado.");

  if (new Date() > usuario.tokenVerificacionExp)
    throw new BadRequestError(
      "El token de verificación ha expirado. Solicita uno nuevo.",
    );

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      emailVerificado: true,
      tokenVerificacion: null,
      tokenVerificacionExp: null,
    },
  });

  return {
    message: "Correo verificado correctamente. Ya puedes iniciar sesión.",
  };
};

export const reenviarVerificacionService = async (email) => {
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario)
    throw new BadRequestError("No existe una cuenta con ese correo.");

  if (usuario.emailVerificado)
    throw new BadRequestError("El correo ya fue verificado.");

  const tokenVerificacion = crypto.randomBytes(32).toString("hex");
  const tokenVerificacionExp = new Date(Date.now() + 1000 * 60 * 60 * 24);

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { tokenVerificacion, tokenVerificacionExp },
  });

  await sendVerificationEmail(email, tokenVerificacion);

  return { message: "Correo de verificación reenviado correctamente." };
};
