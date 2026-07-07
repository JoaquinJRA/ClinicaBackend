import { BadRequestError } from "../utils/appError.js";
import { toPositiveId, pickAllowedFields } from "../utils/request.js";

const ESTADOS_USUARIO = ["ACTIVO", "INACTIVO"];
const ESTADOS_CITA = ["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"];
const ESTADOS_PAGO = ["PENDIENTE", "PAGADO", "FALLIDO"];
const SEVERIDADES_ALERGIA = ["SEVERO", "MODERADO", "LEVE"];

export const getIdParam = (params, field = "id") =>
  toPositiveId(params.id, field);

export const getEspecialidadIdQuery = (query) =>
  query.especialidadId
    ? toPositiveId(query.especialidadId, "especialidadId")
    : undefined;

export const getOptionalMedicoId = (body) =>
  body.medicoId ? toPositiveId(body.medicoId, "medicoId") : undefined;

export const getRequiredMedicoId = (body) =>
  toPositiveId(body.medicoId, "medicoId");

export const validateEstadoUsuario = (estado) => {
  if (!ESTADOS_USUARIO.includes(estado)) {
    throw new BadRequestError("Estado invalido.");
  }
};

export const validateEstadoCita = (estado) => {
  if (!ESTADOS_CITA.includes(estado)) {
    throw new BadRequestError("Estado invalido.");
  }
};

export const validateEstadoPago = (estado) => {
  if (estado && !ESTADOS_PAGO.includes(estado)) {
    throw new BadRequestError("Estado invalido.");
  }
};

export const getUsuariosAdminFilters = (queryParams) => {
  const { rol, q, estado } = queryParams;
  const query = String(q || "").trim();
  const estadoUsuario = estado ? String(estado) : undefined;

  if (estadoUsuario) {
    validateEstadoUsuario(estadoUsuario);
  }

  return { rol, query, estadoUsuario };
};

export const getAuditoriaFilters = (queryParams) => {
  const { q, accion, modulo, fechaDesde, fechaHasta } = queryParams;
  return {
    accion,
    modulo,
    query: String(q || "").trim(),
    fechaDesde,
    fechaHasta,
  };
};

export const getCitasAdminFilters = (queryParams) => {
  const { estado, fecha } = queryParams;
  if (estado) {
    validateEstadoCita(estado);
  }
  return { estado, fecha };
};

export const getPagosAdminFilters = (queryParams) => {
  const { q, estado, fechaDesde, fechaHasta } = queryParams;
  validateEstadoPago(estado);
  return {
    estado,
    fechaDesde,
    fechaHasta,
    query: String(q || "").trim(),
  };
};

export const validateCreateUsuarioData = (body) => {
  const { nombre, apellido, email, contrasena, rol } = body;
  if (!nombre || !apellido || !email || !contrasena || !rol) {
    throw new BadRequestError("Faltan campos obligatorios.");
  }
};

export const getUpdateUsuarioData = (body) => ({
  usuarioData: pickAllowedFields(body, ["nombre", "apellido", "email", "estado"]),
  pacienteData: pickAllowedFields(body, [
    "dni",
    "telefono",
    "direccion",
    "fechaNacimiento",
    "genero",
    "grupoSanguineo",
    "peso",
    "altura",
    "presionArterial",
    "antecedentesMedicos",
  ]),
  medicoData: pickAllowedFields(body, [
    "numeroColegiatura",
    "telefono",
    "estado",
    "especialidadId",
  ]),
});

export const normalizeAlergias = (items) =>
  Array.isArray(items)
    ? items
        .map((alergia) => ({
          nombre: String(alergia.nombre || "").trim(),
          severidad: SEVERIDADES_ALERGIA.includes(alergia.severidad)
            ? alergia.severidad
            : "LEVE",
        }))
        .filter((alergia) => alergia.nombre)
    : [];

export const normalizeMedicamentos = (items) =>
  Array.isArray(items)
    ? items
        .map((medicamento) => ({
          nombre: String(medicamento.nombre || "").trim(),
          dosis: String(medicamento.dosis || "").trim(),
          instrucciones: String(medicamento.instrucciones || "").trim(),
          frecuencia: medicamento.frecuencia
            ? String(medicamento.frecuencia).trim()
            : undefined,
          fechaInicio: medicamento.fechaInicio
            ? new Date(medicamento.fechaInicio)
            : undefined,
          duracion:
            medicamento.duracion === "" || medicamento.duracion === undefined
              ? undefined
              : Number(medicamento.duracion),
          unidadDuracion: medicamento.unidadDuracion
            ? String(medicamento.unidadDuracion).trim()
            : undefined,
          diasRestantes:
            medicamento.diasRestantes === "" ||
            medicamento.diasRestantes === undefined
              ? undefined
              : Number(medicamento.diasRestantes),
          activo:
            typeof medicamento.activo === "boolean" ? medicamento.activo : true,
        }))
        .filter((medicamento) => medicamento.nombre && medicamento.dosis)
    : [];
