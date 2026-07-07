import {
  getCitasDoctorService,
  updateEstadoCitaDoctorService,
} from "../services/doctor/citasDoctor.service.js";
import {
  createDiagnosticoService,
  getDiagnosticosPacienteService,
} from "../services/doctor/diagnosticosDoctor.service.js";
import {
  buscarPacientesService,
  getPerfilMedicoPacienteService,
} from "../services/doctor/pacientesDoctor.service.js";
import {
  createPrescripcionesService,
  deletePrescripcionService,
  getPrescripcionesActivasService,
  updatePrescripcionService,
} from "../services/doctor/prescripcionesDoctor.service.js";
import {
  getCitaIdParam,
  getCitasDoctorFilters,
  getCreateDiagnosticoData,
  getEstadoCitaData,
  getMedicoIdParam,
  getPacienteIdParam,
  getPrescripcionIdParam,
  getUpdatePrescripcionData,
  validatePrescripcionesPayload,
} from "../validators/doctor.validator.js";

export const getCitasDoctor = async (req, res, next) => {
  try {
    const medicoId = getMedicoIdParam(req.params);
    const filters = getCitasDoctorFilters(req.query);
    const citas = await getCitasDoctorService({ medicoId, ...filters });

    return res.status(200).json(citas);
  } catch (err) {
    next(err);
  }
};

export const updateEstadoCitaDoctor = async (req, res, next) => {
  try {
    const id = getCitaIdParam(req.params);
    const data = getEstadoCitaData(req.body);
    const cita = await updateEstadoCitaDoctorService({ id, ...data });

    return res.status(200).json(cita);
  } catch (err) {
    next(err);
  }
};

export const buscarPacientes = async (req, res, next) => {
  try {
    const pacientes = await buscarPacientesService(req.query.q);

    return res.status(200).json(pacientes);
  } catch (err) {
    next(err);
  }
};

export const getPrescripcionesActivas = async (req, res, next) => {
  try {
    const pacienteId = getPacienteIdParam(req.params);
    const medicamentos = await getPrescripcionesActivasService(pacienteId);

    return res.status(200).json(medicamentos);
  } catch (err) {
    next(err);
  }
};

export const createPrescripciones = async (req, res, next) => {
  try {
    const pacienteId = getPacienteIdParam(req.params);
    const { medicamentos } = req.body;

    validatePrescripcionesPayload(medicamentos);

    const resultado = await createPrescripcionesService({
      pacienteId,
      medicamentos,
    });

    return res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
};

export const deletePrescripcion = async (req, res, next) => {
  try {
    const id = getPrescripcionIdParam(req.params);
    const medicamento = await deletePrescripcionService(id);

    return res.status(200).json(medicamento);
  } catch (err) {
    next(err);
  }
};

export const updatePrescripcion = async (req, res, next) => {
  try {
    const id = getPrescripcionIdParam(req.params);
    const data = getUpdatePrescripcionData(req.body);
    const medicamento = await updatePrescripcionService(id, data);

    return res.status(200).json(medicamento);
  } catch (err) {
    next(err);
  }
};

export const getDiagnosticosPaciente = async (req, res, next) => {
  try {
    const pacienteId = getPacienteIdParam(req.params);
    const diagnosticos = await getDiagnosticosPacienteService(pacienteId);

    return res.status(200).json(diagnosticos);
  } catch (err) {
    next(err);
  }
};

export const getPerfilMedicoPaciente = async (req, res, next) => {
  try {
    const pacienteId = getPacienteIdParam(req.params);
    const paciente = await getPerfilMedicoPacienteService(pacienteId);

    return res.status(200).json(paciente);
  } catch (err) {
    next(err);
  }
};

export const createDiagnostico = async (req, res, next) => {
  try {
    const data = getCreateDiagnosticoData(req.body);
    const consulta = await createDiagnosticoService({
      userId: req.user.id,
      ...data,
    });

    return res.status(201).json(consulta);
  } catch (err) {
    next(err);
  }
};
