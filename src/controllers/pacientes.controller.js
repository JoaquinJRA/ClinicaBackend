import {
  createAlergiaPacienteService,
  deleteAlergiaPacienteService,
  getAlergiasPacienteService,
} from "../services/pacientes/alergiasPaciente.service.js";
import { getHistorialClinicoPacienteService } from "../services/pacientes/historialPaciente.service.js";
import {
  createMedicamentoPacienteService,
  deleteMedicamentoPacienteService,
  getMedicamentosPacienteService,
  marcarSeguimientoMedicamentoService,
  updateMedicamentoPacienteService,
} from "../services/pacientes/medicamentosPaciente.service.js";
import {
  getPerfilPacienteService,
  updatePerfilPacienteService,
} from "../services/pacientes/perfilPaciente.service.js";
import {
  getAlergiaParams,
  getMedicamentoIdParam,
  getMedicamentoPacienteData,
  getMedicamentoParams,
  getPacienteIdParam,
  getPerfilPacienteData,
  getSeguimientoMedicamentoData,
  validateSeveridadAlergia,
} from "../validators/pacientes.validator.js";

export const getPerfilPaciente = async (req, res, next) => {
  try {
    const id = getPacienteIdParam(req.params);
    const paciente = await getPerfilPacienteService(id);

    return res.status(200).json(paciente);
  } catch (err) {
    next(err);
  }
};

export const updatePerfilPaciente = async (req, res, next) => {
  try {
    const id = getPacienteIdParam(req.params);
    const data = getPerfilPacienteData(req.body);
    const paciente = await updatePerfilPacienteService(id, data);

    return res.status(200).json(paciente);
  } catch (err) {
    next(err);
  }
};

export const getAlergiasPaciente = async (req, res, next) => {
  try {
    const pacienteId = getPacienteIdParam(req.params);
    const alergias = await getAlergiasPacienteService(pacienteId);

    return res.status(200).json(alergias);
  } catch (err) {
    next(err);
  }
};

export const createAlergiaPaciente = async (req, res, next) => {
  try {
    const pacienteId = getPacienteIdParam(req.params);
    const { nombre, severidad } = req.body;

    validateSeveridadAlergia(severidad);

    const alergia = await createAlergiaPacienteService({
      pacienteId,
      nombre,
      severidad,
    });

    return res.status(201).json(alergia);
  } catch (err) {
    next(err);
  }
};

export const deleteAlergiaPaciente = async (req, res, next) => {
  try {
    const params = getAlergiaParams(req.params);
    await deleteAlergiaPacienteService(params);

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const getMedicamentosPaciente = async (req, res, next) => {
  try {
    const pacienteId = getPacienteIdParam(req.params);
    const medicamentos = await getMedicamentosPacienteService(pacienteId);

    return res.status(200).json(medicamentos);
  } catch (err) {
    next(err);
  }
};

export const marcarSeguimientoMedicamento = async (req, res, next) => {
  try {
    const { pacienteId, id: medicamentoId } = getMedicamentoParams(req.params);
    const { estado, fecha } = getSeguimientoMedicamentoData(req.body);
    const seguimiento = await marcarSeguimientoMedicamentoService({
      pacienteId,
      medicamentoId,
      estado,
      fecha,
    });

    return res.status(200).json(seguimiento);
  } catch (err) {
    next(err);
  }
};

export const getHistorialClinicoPaciente = async (req, res, next) => {
  try {
    const pacienteId = getPacienteIdParam(req.params);
    const historial = await getHistorialClinicoPacienteService(pacienteId);

    return res.status(200).json(historial);
  } catch (err) {
    next(err);
  }
};

export const createMedicamentoPaciente = async (req, res, next) => {
  try {
    const pacienteId = getPacienteIdParam(req.params);
    const { nombre, dosis, instrucciones } = req.body;
    const medicamento = await createMedicamentoPacienteService({
      pacienteId,
      nombre,
      dosis,
      instrucciones,
    });

    return res.status(201).json(medicamento);
  } catch (err) {
    next(err);
  }
};

export const updateMedicamentoPaciente = async (req, res, next) => {
  try {
    const { pacienteId, id } = getMedicamentoParams(req.params);
    const data = getMedicamentoPacienteData(req.body);
    const medicamento = await updateMedicamentoPacienteService({
      pacienteId,
      id,
      data,
    });

    return res.status(200).json(medicamento);
  } catch (err) {
    next(err);
  }
};

export const deleteMedicamentoPaciente = async (req, res, next) => {
  try {
    const id = getMedicamentoIdParam(req.params);
    const medicamento = await deleteMedicamentoPacienteService(id);

    return res.status(200).json(medicamento);
  } catch (err) {
    next(err);
  }
};
