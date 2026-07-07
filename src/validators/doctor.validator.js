import { BadRequestError } from "../utils/appError.js";
import { parseFechaCita } from "../utils/doctorDate.js";
import { toPositiveId } from "../utils/request.js";

const ESTADOS_CITA = ["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"];

export const getMedicoIdParam = (params) =>
  toPositiveId(params.medicoId, "medicoId");

export const getCitaIdParam = (params) => toPositiveId(params.id);

export const getPacienteIdParam = (params) =>
  toPositiveId(params.pacienteId, "pacienteId");

export const getPrescripcionIdParam = (params) =>
  toPositiveId(params.medId, "medId");

export const validateEstadoCita = (estado) => {
  if (!ESTADOS_CITA.includes(estado)) {
    throw new BadRequestError("Estado invalido.");
  }
};

export const getCitasDoctorFilters = (query) => {
  const { estado, fecha } = query;

  if (estado) {
    validateEstadoCita(estado);
  }

  return { estado, fecha };
};

export const getEstadoCitaData = (body) => {
  const { estado, nuevaFecha } = body;

  validateEstadoCita(estado);

  return {
    estado,
    nuevaFecha: nuevaFecha ? parseFechaCita(nuevaFecha) : null,
  };
};

export const validatePrescripcionesPayload = (medicamentos) => {
  if (!Array.isArray(medicamentos) || medicamentos.length === 0) {
    throw new BadRequestError("Debe enviar al menos un medicamento.");
  }
};

export const getUpdatePrescripcionData = (body) => {
  const {
    nombre,
    dosis,
    frecuencia,
    fechaInicio,
    duracion,
    unidadDuracion,
    instrucciones,
  } = body;

  if (!nombre || !dosis) {
    throw new BadRequestError("Nombre y dosis son requeridos.");
  }

  return {
    nombre,
    dosis,
    frecuencia,
    fechaInicio,
    duracion,
    unidadDuracion,
    instrucciones,
  };
};

export const getCreateDiagnosticoData = (body) => {
  const {
    citaId,
    motivo,
    sintomas,
    diagnostico,
    tratamiento,
    notas,
    medicamentos = [],
  } = body;

  if (!diagnostico) {
    throw new BadRequestError("El diagnostico es requerido.");
  }

  return {
    pacienteId: toPositiveId(body.pacienteId, "pacienteId"),
    citaId: citaId ? toPositiveId(citaId, "citaId") : null,
    motivo,
    sintomas,
    diagnostico,
    tratamiento,
    notas,
    medicamentos,
  };
};

export const getMedicamentosValidos = (medicamentos) =>
  Array.isArray(medicamentos)
    ? medicamentos.filter((medicamento) => medicamento?.nombre && medicamento?.dosis)
    : [];
