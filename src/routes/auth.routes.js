import { Router } from "express";

import {
  login,
  logout,
  profile,
  register,
} from "../controllers/auth.controller.js";

import { verifySession } from "../middlewares/verifySession.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", verifySession, logout);
router.get("/profile", verifySession, profile);
router.get("/verificar-email", verificarEmail);
router.post("/reenviar-verificacion", reenviarVerificacion);

export default router;
