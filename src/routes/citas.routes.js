import { Router } from "express";

import {
  createCita,
  getCitasPaciente,
  getDisponibilidadMes,
  getEspecialidadesCitas,
  getSlotsDisponibles,
  updateCita,
  updateEstadoCita,
} from "../controllers/citas.controller.js";

const router = Router();

router.get("/especialidades", getEspecialidadesCitas);
router.get("/disponibilidad-mes", getDisponibilidadMes);
router.get("/slots-disponibles", getSlotsDisponibles);
router.get("/paciente/:pacienteId", getCitasPaciente);
router.post("/", createCita);
router.put("/:id", updateCita);
router.put("/:id/estado", updateEstadoCita);

export default router;
