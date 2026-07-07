import { prisma } from "../../../prisma/client.js";

export const sanitize = (value) => {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value instanceof Date) return value.toISOString();
  if (!value || typeof value !== "object") return value;

  return Object.entries(value).reduce((result, [key, entry]) => {
    if (key !== "contrasena") result[key] = sanitize(entry);
    return result;
  }, {});
};

const actorNombre = async (req) => {
  if (!req.user?.id) {
    return { usuarioId: null, usuarioNombre: "Sistema", rol: "SISTEMA" };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: Number(req.user.id) },
    include: { rol: true },
  });

  return {
    usuarioId: usuario?.id ?? Number(req.user.id),
    usuarioNombre: usuario
      ? `${usuario.nombre} ${usuario.apellido}`
      : `Usuario ${req.user.id}`,
    rol: usuario?.rol?.nombre ?? req.user.rol ?? "ADMIN",
  };
};

export const registrarAuditoria = async (req, data, tx = prisma) => {
  const actor = await actorNombre(req);
  return tx.auditoria.create({
    data: {
      ...actor,
      accion: data.accion,
      modulo: data.modulo,
      entidad: data.entidad,
      entidadId: data.entidadId,
      detalle: data.detalle ? sanitize(data.detalle) : undefined,
      ip: req.ip || req.headers["x-forwarded-for"] || undefined,
    },
  });
};

export const registrarAuditoriaSeguro = async (req, data) => {
  try {
    await registrarAuditoria(req, data);
  } catch (err) {
    console.error("No se pudo registrar auditoria:", err.message);
  }
};

export const getAuditoriaAdminService = async ({
  query,
  accion,
  modulo,
  fechaDesde,
  fechaHasta,
}) => {
  const creadoEn = {};
  if (fechaDesde) creadoEn.gte = new Date(`${fechaDesde}T00:00:00`);
  if (fechaHasta) creadoEn.lte = new Date(`${fechaHasta}T23:59:59`);

  return prisma.auditoria.findMany({
    where: {
      ...(accion && { accion: String(accion) }),
      ...(modulo && { modulo: String(modulo) }),
      ...(Object.keys(creadoEn).length && { creadoEn }),
      ...(query && {
        OR: [
          { usuarioNombre: { contains: query, mode: "insensitive" } },
          { accion: { contains: query, mode: "insensitive" } },
          { modulo: { contains: query, mode: "insensitive" } },
          { entidad: { contains: query, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { creadoEn: "desc" },
    take: 200,
  });
};
