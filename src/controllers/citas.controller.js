import { getEspecialidadesCitasService } from "../services/citas/catalogosCitas.service.js";
import { getCitasPacienteService } from "../services/citas/citasPaciente.service.js";
import {
  getDisponibilidadMesService,
  getSlotsDisponiblesService,
} from "../services/citas/disponibilidadCitas.service.js";
import {
  createCitaService,
  updateCitaService,
  updateEstadoCitaService,
} from "../services/citas/gestionCitas.service.js";
import {
  getCitaIdParam,
  getCitaPayload,
  getCitasPacienteFilters,
  getEspecialidadIdQuery,
  getFechaDiaQuery,
  getMonthQuery,
  getPacienteIdParam,
  getUpdateCitaPayload,
  getYearQuery,
  validateEstadoCita,
} from "../validators/citas.validator.js";

export const getDisponibilidadMes = async (req, res, next) => {
  try {
    const disponibilidad = await getDisponibilidadMesService({
      year: getYearQuery(req.query),
      month: getMonthQuery(req.query),
      especialidadId: getEspecialidadIdQuery(req.query),
    });

    return res.status(200).json(disponibilidad);
  } catch (err) {
    next(err);
  }
};

export const getEspecialidadesCitas = async (_req, res, next) => {
  try {
    const especialidades = await getEspecialidadesCitasService();

    return res.status(200).json(especialidades);
  } catch (err) {
    next(err);
  }
};

export const getSlotsDisponibles = async (req, res, next) => {
  try {
    const slots = await getSlotsDisponiblesService({
      fecha: getFechaDiaQuery(req.query),
      especialidadId: getEspecialidadIdQuery(req.query),
    });

    return res.status(200).json(slots);
  } catch (err) {
    next(err);
  }
};

export const getCitasPaciente = async (req, res, next) => {
  try {
    const pacienteId = getPacienteIdParam(req.params);
    const filters = getCitasPacienteFilters(req.query);
    const citas = await getCitasPacienteService({ pacienteId, ...filters });

    return res.status(200).json(citas);
  } catch (err) {
    next(err);
  }
};

export const createCita = async (req, res, next) => {
  try {
    const cita = await createCitaService(getCitaPayload(req.body));

    return res.status(201).json(cita);
  } catch (err) {
    next(err);
  }
};

export const updateCita = async (req, res, next) => {
  try {
    const cita = await updateCitaService(getUpdateCitaPayload(req.params, req.body));

    return res.status(200).json(cita);
  } catch (err) {
    next(err);
  }
};

export const updateEstadoCita = async (req, res, next) => {
  try {
    const id = getCitaIdParam(req.params);
    const { estado } = req.body;

    validateEstadoCita(estado);

    const cita = await updateEstadoCitaService({ id, estado });

    return res.status(200).json(cita);
  } catch (err) {
    next(err);
  }
};
