import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../models/db.js";
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from "../utils/appError.js";

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

export const registerService = async (data) => {
  const {
    firstName,
    lastName,
    email,
    password,
    dni,
    phone,
    address,
    birthDate,
    gender,
  } = data;

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) throw new ConflictError("El correo ya está registrado.");

  const existingPatient = await prisma.patient.findUnique({
    where: {
      dni,
    },
  });

  if (existingPatient) throw new ConflictError("El DNI ya está registrado.");

  const patientRole = await prisma.role.findUnique({
    where: {
      name: "PATIENT",
    },
  });

  if (!patientRole)
    throw new BadRequestError("No existe el rol PATIENT en la base de datos.");

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      roleId: patientRole.id,

      patient: {
        create: {
          dni,
          phone,
          address,
          birthDate: birthDate ? new Date(birthDate) : null,
          gender,
        },
      },
    },
    include: {
      role: true,
      patient: true,
    },
  });

  const token = generateToken({
    id: user.id,
    role: user.role.name,
  });

  return {
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role.name,
    },
  };
};

export const loginService = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      role: true,
    },
  });

  if (!user) throw new UnauthorizedError("Correo o contraseña incorrectos.");

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid)
    throw new UnauthorizedError("Correo o contraseña incorrectos.");

  const token = generateToken({
    id: user.id,
    role: user.role.name,
  });
};
