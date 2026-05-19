import { loginService, registerService } from "../services/auth.service.js";

export const register = async (req, res, next) => {
  try {
    const result = await registerService(req.body);

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    });

    return res.status(201).json({
      message: "Usuario registrado correctamente.",
      user: result.user,
    });
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
