import { BadRequestError } from "../utils/appError.js";
import { parseFechaCita, parseFechaDia } from "../utils/citaDate.js";
import { toPositiveId } from "../utils/request.js";

const ESTADOS_CITA = ["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"];

export const getPacienteIdParam = (params) =>
  toPositiveId(params.pacienteId, "pacienteId");

export const getCitaIdParam = (params) => toPositiveId(params.id, "id");

export const getEspecialidadIdQuery = (query) =>
  toPositiveId(query.especialidadId, "especialidadId");

export const getYearQuery = (query) => {
  const year = toPositiveId(query.year, "year");
  if (year < 1900 || year > 3000) {
    throw new BadRequestError("year invalido.");
  }
  return year;
};

export const getMonthQuery = (query) => {
  const month = toPositiveId(query.month, "month");
  if (month < 1 || month > 12) {
    throw new BadRequestError("month invalido.");
  }
  return month;
};

export const getFechaDiaQuery = (query) => parseFechaDia(query.fecha);

export const validateEstadoCita = (estado) => {
  if (!ESTADOS_CITA.includes(estado)) {
    throw new BadRequestError("Estado invalido.");
  }
};

export const getCitasPacienteFilters = (query) => {
  const { estado } = query;
  if (estado) {
    validateEstadoCita(estado);
  }
  return { estado };
};

export const getCitaPayload = (body) => ({
  pacienteId: toPositiveId(body.pacienteId, "pacienteId"),
  medicoId: toPositiveId(body.medicoId, "medicoId"),
  fecha: parseFechaCita(body.fecha),
  motivo: body.motivo,
});

export const getUpdateCitaPayload = (params, body) => ({
  id: getCitaIdParam(params),
  medicoId: toPositiveId(body.medicoId, "medicoId"),
  fecha: parseFechaCita(body.fecha),
  motivo: body.motivo,
});
