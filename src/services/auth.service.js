import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from "../utils/appError.js";
import { prisma } from "../../prisma/client.js";

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

  const existingUser = await prisma.usuario.findUnique({
    where: { email },
  });

  if (existingUser) throw new ConflictError("El correo ya está registrado.");

  const existingPaciente = await prisma.paciente.findUnique({
    where: { dni },
  });

  if (existingPaciente) throw new ConflictError("El DNI ya está registrado.");

  const rolPaciente = await prisma.rol.findUnique({
    where: { nombre: "PACIENTE" },
  });

  if (!rolPaciente)
    throw new BadRequestError("No existe el rol PACIENTE en la base de datos.");

  const contrasenaHash = await bcrypt.hash(contrasena, 10);

  const usuario = await prisma.usuario.create({
    data: {
      nombre,
      apellido,
      email,
      contrasena: contrasenaHash,
      rolId: rolPaciente.id,

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
    include: {
      rol: true,
      paciente: true,
    },
  });

  const token = generateToken({
    id: usuario.id,
    rol: usuario.rol.nombre,
  });

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

export const loginService = async (email, contrasena) => {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    include: { rol: true },
  });

  if (!usuario) throw new UnauthorizedError("Correo o contraseña incorrectos.");

  const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);

  if (!contrasenaValida)
    throw new UnauthorizedError("Correo o contraseña incorrectos.");

  const token = generateToken({
    id: usuario.id,
    rol: usuario.rol.nombre,
  });

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
