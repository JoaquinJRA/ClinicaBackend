import {
  enviarSmsService,
  loginService,
  reenviarVerificacionService,
  registerService,
  resetearContrasenaService,
  solicitarRecuperacionService,
  verificarSmsService,
  verificarEmailService,
} from "../services/auth.service.js";
import { BadRequestError } from "../utils/appError.js";
import { prisma } from "../../prisma/client.js";

export const register = async (req, res, next) => {
  try {
    const result = await registerService(req.body);

    await prisma.paciente.update({
      where: { usuarioId: result.usuario.id },
      data: { telefonoVerificado: true },
    });

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    });

    return res.status(201).json({
      message: "Usuario registrado correctamente.",
      user: result.usuario,
      usuario: result.usuario,
    });
  } catch (err) {
    next(err);
  }
};

export const enviarSms = async (req, res, next) => {
  try {
    const { telefono } = req.body;
    if (!telefono) throw new BadRequestError("El telefono es obligatorio.");

    const result = await enviarSmsService(telefono);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const verificarSms = async (req, res, next) => {
  try {
    const { telefono, codigo } = req.body;
    if (!telefono) throw new BadRequestError("El telefono es obligatorio.");
    if (!codigo) throw new BadRequestError("El codigo es obligatorio.");

    const result = await verificarSmsService(telefono, codigo);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, contrasena } = req.body;

    const result = await loginService(email, contrasena);

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    });

    return res.status(200).json({
      message: "Inicio de sesión exitoso.",
      usuario: result.usuario,
    });
  } catch (err) {
    next(err);
  }
};

export const solicitarRecuperacion = async (req, res, next) => {
  try {
    const { telefono } = req.body;
    if (!telefono) throw new BadRequestError("El telefono es obligatorio.");

    const result = await solicitarRecuperacionService(telefono);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const resetearContrasena = async (req, res, next) => {
  try {
    const result = await resetearContrasenaService(req.body);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const logout = async (_req, res, next) => {
  try {
    res.clearCookie("token");

    return res.status(200).json({
      message: "Sesión cerrada correctamente.",
    });
  } catch (err) {
    next(err);
  }
};

export const profile = async (req, res, next) => {
  try {
    return res.status(200).json({
      user: req.user,
    });
  } catch (err) {
    next(err);
  }
};

export const verificarEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) throw new BadRequestError("Token no proporcionado.");

    const result = await verificarEmailService(token);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const reenviarVerificacion = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new BadRequestError("El correo es obligatorio.");

    const result = await reenviarVerificacionService(email);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const verificacionTelefono = async (req, res, next) => {
  try {
    const usuarioId = Number(req.params.usuarioId);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      throw new BadRequestError("usuarioId invalido.");
    }

    const paciente = await prisma.paciente.findUnique({
      where: { usuarioId },
      select: { telefonoVerificado: true },
    });

    return res.status(200).json({
      telefonoVerificado: paciente?.telefonoVerificado ?? false,
    });
  } catch (err) {
    next(err);
  }
};
