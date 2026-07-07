import { getAuditoriaAdminService } from "../services/admin/auditoriaAdmin.service.js";
import {
  getEspecialidadesAdminService,
  getMedicosAdminService,
} from "../services/admin/catalogosAdmin.service.js";
import {
  getCitasAdminService,
  reasignarCitaAdminService,
  reprogramarCitaAdminService,
  updateEstadoCitaAdminService,
} from "../services/admin/citasAdmin.service.js";
import { getOcupacionMedicaAdminService } from "../services/admin/ocupacionAdmin.service.js";
import {
  getPagosAdminService,
  getPagosResumenAdminService,
  marcarPagoPagadoAdminService,
} from "../services/admin/pagosAdmin.service.js";
import {
  createUsuarioAdminService,
  deleteUsuarioAdminService,
  getUsuariosAdminService,
  updateEstadoUsuarioAdminService,
  updateUsuarioAdminService,
} from "../services/admin/usuariosAdmin.service.js";
import {
  getAuditoriaFilters,
  getCitasAdminFilters,
  getEspecialidadIdQuery,
  getIdParam,
  getOptionalMedicoId,
  getPagosAdminFilters,
  getRequiredMedicoId,
  getUpdateUsuarioData,
  getUsuariosAdminFilters,
  validateCreateUsuarioData,
  validateEstadoCita,
  validateEstadoUsuario,
} from "../validators/admin.validator.js";

export const getAuditoriaAdmin = async (req, res, next) => {
  try {
    const filters = getAuditoriaFilters(req.query);
    const registros = await getAuditoriaAdminService(filters);

    return res.status(200).json(registros);
  } catch (err) {
    next(err);
  }
};

export const getUsuariosAdmin = async (req, res, next) => {
  try {
    const filters = getUsuariosAdminFilters(req.query);
    const usuarios = await getUsuariosAdminService(filters);

    return res.status(200).json(usuarios);
  } catch (err) {
    next(err);
  }
};

export const createUsuarioAdmin = async (req, res, next) => {
  try {
    validateCreateUsuarioData(req.body);
    const usuario = await createUsuarioAdminService(req);

    return res.status(201).json(usuario);
  } catch (err) {
    next(err);
  }
};

export const updateUsuarioAdmin = async (req, res, next) => {
  try {
    const id = getIdParam(req.params);
    const { usuarioData, pacienteData, medicoData } = getUpdateUsuarioData(
      req.body,
    );
    const usuario = await updateUsuarioAdminService({
      req,
      id,
      usuarioData,
      pacienteData,
      medicoData,
    });

    return res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
};

export const updateEstadoUsuarioAdmin = async (req, res, next) => {
  try {
    const id = getIdParam(req.params);
    const { estado } = req.body;

    validateEstadoUsuario(estado);

    const usuario = await updateEstadoUsuarioAdminService({ req, id, estado });

    return res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
};

export const deleteUsuarioAdmin = async (req, res, next) => {
  try {
    const id = getIdParam(req.params);
    const usuario = await deleteUsuarioAdminService({ req, id });

    return res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
};

export const getEspecialidadesAdmin = async (_req, res, next) => {
  try {
    const especialidades = await getEspecialidadesAdminService();

    return res.status(200).json(especialidades);
  } catch (err) {
    next(err);
  }
};

export const getCitasAdmin = async (req, res, next) => {
  try {
    const filters = getCitasAdminFilters(req.query);
    const citas = await getCitasAdminService(filters);

    return res.status(200).json(citas);
  } catch (err) {
    next(err);
  }
};

export const getOcupacionMedicaAdmin = async (req, res, next) => {
  try {
    const ocupacion = await getOcupacionMedicaAdminService(req.query);

    return res.status(200).json(ocupacion);
  } catch (err) {
    next(err);
  }
};

export const reprogramarCitaAdmin = async (req, res, next) => {
  try {
    const id = getIdParam(req.params);
    const cita = await reprogramarCitaAdminService({
      req,
      id,
      medicoId: getOptionalMedicoId(req.body),
      nuevaFecha: req.body.nuevaFecha,
      nuevaHora: req.body.nuevaHora,
    });

    return res.status(200).json(cita);
  } catch (err) {
    next(err);
  }
};

export const reasignarCitaAdmin = async (req, res, next) => {
  try {
    const id = getIdParam(req.params);
    const medicoId = getRequiredMedicoId(req.body);
    const cita = await reasignarCitaAdminService({ req, id, medicoId });

    return res.status(200).json(cita);
  } catch (err) {
    next(err);
  }
};

export const updateEstadoCitaAdmin = async (req, res, next) => {
  try {
    const id = getIdParam(req.params);
    const { estado } = req.body;

    validateEstadoCita(estado);

    const cita = await updateEstadoCitaAdminService({ req, id, estado });

    return res.status(200).json(cita);
  } catch (err) {
    next(err);
  }
};

export const getMedicosAdmin = async (req, res, next) => {
  try {
    const especialidadId = getEspecialidadIdQuery(req.query);
    const medicos = await getMedicosAdminService(especialidadId);

    return res.status(200).json(medicos);
  } catch (err) {
    next(err);
  }
};

export const getPagosResumenAdmin = async (_req, res, next) => {
  try {
    const resumen = await getPagosResumenAdminService();

    return res.status(200).json(resumen);
  } catch (err) {
    next(err);
  }
};

export const getPagosAdmin = async (req, res, next) => {
  try {
    const filters = getPagosAdminFilters(req.query);
    const pagos = await getPagosAdminService(filters);

    return res.status(200).json(pagos);
  } catch (err) {
    next(err);
  }
};

export const marcarPagoPagadoAdmin = async (req, res, next) => {
  try {
    const id = getIdParam(req.params);
    const pago = await marcarPagoPagadoAdminService({ req, id });

    return res.status(200).json(pago);
  } catch (err) {
    next(err);
  }
};
