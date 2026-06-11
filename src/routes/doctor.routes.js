import { Router } from "express";
import {
  buscarPacientes,
  createDiagnostico,
  createPrescripciones,
  deletePrescripcion,
  getCitasDoctor,
  getDiagnosticosPaciente,
  getPerfilMedicoPaciente,
  getPrescripcionesActivas,
  updateEstadoCitaDoctor,
} from "../controllers/doctor.controller.js";
import { requireRole } from "../middlewares/requireRole.js";
import { verifySession } from "../middlewares/verifySession.js";

const router = Router();

router.use(verifySession, requireRole("MEDICO"));

router.get("/:medicoId/citas", getCitasDoctor);
router.put("/citas/:id/estado", updateEstadoCitaDoctor);
router.get("/pacientes/buscar", buscarPacientes);
router.get(
  "/pacientes/:pacienteId/prescripciones-activas",
  getPrescripcionesActivas,
);
router.post("/pacientes/:pacienteId/prescripciones", createPrescripciones);
router.delete("/prescripciones/:medId", deletePrescripcion);
router.get("/pacientes/:pacienteId/diagnosticos", getDiagnosticosPaciente);
router.get("/pacientes/:pacienteId/perfil-medico", getPerfilMedicoPaciente);
router.post("/diagnosticos", createDiagnostico);

export default router;
