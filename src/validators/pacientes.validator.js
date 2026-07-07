import { BadRequestError } from "../utils/appError.js";
import { getInicioDiaLocal } from "../utils/date.js";
import { pickAllowedFields, toPositiveId } from "../utils/request.js";

const SEVERIDADES_VALIDAS = ["SEVERO", "MODERADO", "LEVE"];
const CAMPOS_PERFIL_PERMITIDOS = [
  "grupoSanguineo",
  "peso",
  "altura",
  "presionArterial",
  "telefono",
  "direccion",
];
const CAMPOS_MEDICAMENTO_PERMITIDOS = [
  "nombre",
  "dosis",
  "instrucciones",
  "activo",
];
const ESTADOS_SEGUIMIENTO = ["TOMADO", "SALTADO"];

export const getPacienteIdParam = (params) => toPositiveId(params.id);

export const getAlergiaParams = (params) => ({
  pacienteId: toPositiveId(params.id),
  id: toPositiveId(params.aid, "aid"),
});

export const getMedicamentoParams = (params) => ({
  pacienteId: toPositiveId(params.id),
  id: toPositiveId(params.mid, "mid"),
});

export const getMedicamentoIdParam = (params) =>
  toPositiveId(params.mid, "mid");

export const getPerfilPacienteData = (body) =>
  pickAllowedFields(body, CAMPOS_PERFIL_PERMITIDOS);

export const getMedicamentoPacienteData = (body) =>
  pickAllowedFields(body, CAMPOS_MEDICAMENTO_PERMITIDOS);

export const validateSeveridadAlergia = (severidad) => {
  if (!SEVERIDADES_VALIDAS.includes(severidad)) {
    throw new BadRequestError("Severidad invalida.");
  }
};

export const getSeguimientoMedicamentoData = (body) => {
  const estado = String(body.estado || "").toUpperCase();

  if (!ESTADOS_SEGUIMIENTO.includes(estado)) {
    throw new BadRequestError("Estado de seguimiento invalido.");
  }

  return {
    estado,
    fecha: getInicioDiaLocal(body.fecha ?? new Date()),
  };
};
