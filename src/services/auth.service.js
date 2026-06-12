import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import twilio from "twilio";
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

const telefonosVerificados = new Set();

const normalizarTelefono = (telefono) => {
  const limpio = String(telefono || "").replace(/\D/g, "");

  if (!limpio) {
    throw new BadRequestError("El telefono es obligatorio.");
  }

  return limpio.startsWith("51") ? `+${limpio}` : `+51${limpio}`;
};

const getTwilioVerify = () => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } =
    process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    throw new BadRequestError("Twilio no esta configurado en el servidor.");
  }

  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN).verify.v2.services(
    TWILIO_VERIFY_SERVICE_SID,
  );
};

const consumirTelefonoVerificado = (telefono) => {
  const telefonoNormalizado = normalizarTelefono(telefono);

  if (!telefonosVerificados.has(telefonoNormalizado)) {
    throw new BadRequestError("Debe verificar su numero telefonico.");
  }

  telefonosVerificados.delete(telefonoNormalizado);
  return telefonoNormalizado;
};

const buscarPacientePorTelefono = async (telefono) => {
  const telefonoNormalizado = normalizarTelefono(telefono);
  const telefonoLimpio = telefonoNormalizado.replace(/\D/g, "");
  const variantes = [
    telefonoNormalizado,
    telefonoLimpio,
    telefonoLimpio.startsWith("51") ? telefonoLimpio.slice(2) : telefonoLimpio,
  ];

  const paciente = await prisma.paciente.findFirst({
    where: {
      OR: [...new Set(variantes)].map((valor) => ({ telefono: valor })),
    },
    include: { usuario: true },
  });

  return { paciente, telefonoNormalizado };
};

export const enviarSmsService = async (telefono) => {
  const telefonoNormalizado = normalizarTelefono(telefono);

  await getTwilioVerify().verifications.create({
    to: telefonoNormalizado,
    channel: "sms",
  });

  return {
    message: "Codigo enviado correctamente.",
    telefono: telefonoNormalizado,
  };
};

export const verificarSmsService = async (telefono, codigo) => {
  const telefonoNormalizado = normalizarTelefono(telefono);

  if (!/^\d{6}$/.test(String(codigo || ""))) {
    throw new BadRequestError("Ingresa el codigo de 6 digitos.");
  }

  const verification = await getTwilioVerify().verificationChecks.create({
    to: telefonoNormalizado,
    code: codigo,
  });

  if (verification.status !== "approved") {
    throw new BadRequestError("Codigo incorrecto o expirado.");
  }

  telefonosVerificados.add(telefonoNormalizado);

  return {
    telefono: telefonoNormalizado,
    telefonoVerificado: true,
  };
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
    tipoSangre,
    grupoSanguineo,
    peso,
    altura,
    presionArterial,
    antecedentesMedicos,
    contactoEmergenciaNombre,
    contactoEmergenciaTelefono,
    alergias,
    medicamentos,
    telefonoVerificado,
  } = data;

  if (!telefono) {
    throw new BadRequestError("El telefono es obligatorio.");
  }

  if (telefonoVerificado !== true) {
    throw new BadRequestError("Debe verificar su numero telefonico.");
  }

  const telefonoNormalizado = consumirTelefonoVerificado(telefono);

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
  const alergiasValidas = Array.isArray(alergias)
    ? alergias.filter((alergia) => alergia?.nombre)
    : [];
  const medicamentosValidos = Array.isArray(medicamentos)
    ? medicamentos.filter((medicamento) => medicamento?.nombre)
    : [];

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
          telefono: telefonoNormalizado,
          telefonoVerificado: true,
          direccion,
          fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
          genero,
          tipoSangre,
          grupoSanguineo,
          peso,
          altura,
          presionArterial,
          antecedentesMedicos,
          contactoEmergenciaNombre,
          contactoEmergenciaTelefono,
          alergias: alergiasValidas.length
            ? {
                create: alergiasValidas.map((alergia) => ({
                  nombre: alergia.nombre,
                  severidad: alergia.severidad,
                })),
              }
            : undefined,
          medicamentos: medicamentosValidos.length
            ? {
                create: medicamentosValidos.map((medicamento) => ({
                  nombre: medicamento.nombre,
                  dosis: medicamento.dosis,
                  instrucciones: medicamento.instrucciones,
                  activo: medicamento.activo,
                })),
              }
            : undefined,
        },
      },
    },
    include: { rol: true, paciente: true, medico: true },
  });

  const token = generateToken({ id: usuario.id, rol: usuario.rol.nombre });

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol.nombre,
      pacienteId: usuario.paciente?.id,
      medicoId: usuario.medico?.id,
    },
  };
};

export const loginService = async (email, contrasena) => {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    include: { rol: true, paciente: true, medico: true },
  });

  if (!usuario) throw new UnauthorizedError("Correo o contraseña incorrectos.");

  const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);
  if (!contrasenaValida)
    throw new UnauthorizedError("Correo o contraseña incorrectos.");

  const token = generateToken({ id: usuario.id, rol: usuario.rol.nombre });

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol.nombre,
      pacienteId: usuario.paciente?.id,
      medicoId: usuario.medico?.id,
    },
  };
};

export const solicitarRecuperacionService = async (telefono) => {
  const { paciente, telefonoNormalizado } =
    await buscarPacientePorTelefono(telefono);

  if (!paciente?.usuario) {
    throw new BadRequestError("No existe una cuenta con ese telefono.");
  }

  await getTwilioVerify().verifications.create({
    to: telefonoNormalizado,
    channel: "sms",
  });

  return {
    message: "Codigo enviado al telefono.",
    telefono: telefonoNormalizado,
  };
};

export const resetearContrasenaService = async ({
  telefono,
  codigo,
  nuevaContrasena,
}) => {
  if (!telefono) throw new BadRequestError("El telefono es obligatorio.");
  if (!codigo) throw new BadRequestError("El codigo es obligatorio.");
  if (!nuevaContrasena || nuevaContrasena.length < 6) {
    throw new BadRequestError("La contrasena debe tener minimo 6 caracteres.");
  }

  const { paciente, telefonoNormalizado } =
    await buscarPacientePorTelefono(telefono);

  if (!paciente?.usuario) {
    throw new BadRequestError("No existe una cuenta con ese telefono.");
  }

  const verification = await getTwilioVerify().verificationChecks.create({
    to: telefonoNormalizado,
    code: codigo,
  });

  if (verification.status !== "approved") {
    throw new BadRequestError("Codigo incorrecto o expirado.");
  }

  const contrasenaHash = await bcrypt.hash(nuevaContrasena, 10);

  await prisma.usuario.update({
    where: { id: paciente.usuario.id },
    data: { contrasena: contrasenaHash },
  });

  return { message: "Contrasena actualizada correctamente." };
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
