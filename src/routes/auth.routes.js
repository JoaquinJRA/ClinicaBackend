import { Router } from "express";

import {
  enviarSms,
  login,
  logout,
  profile,
  reenviarVerificacion,
  register,
  resetearContrasena,
  solicitarRecuperacion,
  verificacionTelefono,
  verificarEmail,
  verificarSms,
} from "../controllers/auth.controller.js";

import { verifySession } from "../middlewares/verifySession.js";

const router = Router();

router.post("/register", register);
router.post("/enviar-sms", enviarSms);
router.post("/verificar-sms", verificarSms);
router.post("/login", login);
router.post("/solicitar-recuperacion", solicitarRecuperacion);
router.post("/resetear-contrasena", resetearContrasena);
router.post("/logout", verifySession, logout);
router.get("/profile", verifySession, profile);
router.get("/verificar-email", verificarEmail);
router.post("/reenviar-verificacion", reenviarVerificacion);
router.get("/verificacion-telefono/:usuarioId", verificacionTelefono);

export default router;
