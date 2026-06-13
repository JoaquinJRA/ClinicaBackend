import { Router } from "express";
import {
  createUsuarioAdmin,
  deleteUsuarioAdmin,
  getAuditoriaAdmin,
  getCitasAdmin,
  getEspecialidadesAdmin,
  getMedicosAdmin,
  getOcupacionMedicaAdmin,
  getPagosAdmin,
  getPagosResumenAdmin,
  getUsuariosAdmin,
  marcarPagoPagadoAdmin,
  reasignarCitaAdmin,
  reprogramarCitaAdmin,
  updateEstadoCitaAdmin,
  updateEstadoUsuarioAdmin,
  updateUsuarioAdmin,
} from "../controllers/admin.controller.js";
import { requireRole } from "../middlewares/requireRole.js";
import { verifySession } from "../middlewares/verifySession.js";

const router = Router();

router.use(verifySession, requireRole("ADMIN"));

router.get("/auditoria", getAuditoriaAdmin);
router.get("/usuarios", getUsuariosAdmin);
router.post("/usuarios", createUsuarioAdmin);
router.put("/usuarios/:id", updateUsuarioAdmin);
router.patch("/usuarios/:id/estado", updateEstadoUsuarioAdmin);
router.delete("/usuarios/:id", deleteUsuarioAdmin);
router.get("/especialidades", getEspecialidadesAdmin);

router.get("/citas", getCitasAdmin);
router.get("/ocupacion-medica", getOcupacionMedicaAdmin);
router.put("/citas/:id/reprogramar", reprogramarCitaAdmin);
router.put("/citas/:id/reasignar", reasignarCitaAdmin);
router.put("/citas/:id/estado", updateEstadoCitaAdmin);
router.get("/medicos", getMedicosAdmin);

router.get("/pagos/resumen", getPagosResumenAdmin);
router.get("/pagos", getPagosAdmin);
router.patch("/pagos/:id/marcar-pagado", marcarPagoPagadoAdmin);

export default router;
