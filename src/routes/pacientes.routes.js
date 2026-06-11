import { Router } from "express";

import {
  createAlergiaPaciente,
  createMedicamentoPaciente,
  deleteAlergiaPaciente,
  deleteMedicamentoPaciente,
  getAlergiasPaciente,
  getHistorialClinicoPaciente,
  getMedicamentosPaciente,
  getPerfilPaciente,
  updateMedicamentoPaciente,
  updatePerfilPaciente,
} from "../controllers/pacientes.controller.js";

const router = Router();

router.get("/:id/perfil", getPerfilPaciente);
router.put("/:id/perfil", updatePerfilPaciente);
router.get("/:id/alergias", getAlergiasPaciente);
router.post("/:id/alergias", createAlergiaPaciente);
router.delete("/:id/alergias/:aid", deleteAlergiaPaciente);
router.get("/:id/historial", getHistorialClinicoPaciente);
router.get("/:id/medicamentos", getMedicamentosPaciente);
router.post("/:id/medicamentos", createMedicamentoPaciente);
router.put("/:id/medicamentos/:mid", updateMedicamentoPaciente);
router.delete("/:id/medicamentos/:mid", deleteMedicamentoPaciente);

export default router;
