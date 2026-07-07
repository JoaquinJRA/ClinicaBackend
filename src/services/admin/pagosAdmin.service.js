import { prisma } from "../../../prisma/client.js";
import { getCostoEspecialidad } from "../../utils/adminCatalogs.js";
import { NotFoundError } from "../../utils/appError.js";
import {
  registrarAuditoriaSeguro,
  sanitize,
} from "./auditoriaAdmin.service.js";

export const getPagosResumenAdminService = async () => {
  const [pagado, pagosPendientes, pagosCancelados] = await Promise.all([
    prisma.pago.aggregate({
      where: { estado: "PAGADO" },
      _sum: { monto: true },
    }),
    prisma.pago.count({ where: { estado: "PENDIENTE" } }),
    prisma.pago.count({ where: { estado: "FALLIDO" } }),
  ]);

  return {
    totalRecaudado: Number(pagado._sum.monto || 0),
    pagosPendientes,
    pagosCancelados,
  };
};

export const getPagosAdminService = async ({
  query,
  estado,
  fechaDesde,
  fechaHasta,
}) => {
  const creadoEn = {};
  if (fechaDesde) creadoEn.gte = new Date(`${fechaDesde}T00:00:00`);
  if (fechaHasta) creadoEn.lte = new Date(`${fechaHasta}T23:59:59`);

  const pagos = await prisma.pago.findMany({
    where: {
      ...(estado && { estado }),
      ...(Object.keys(creadoEn).length && { creadoEn }),
      ...(query && {
        OR: [
          ...(Number.isInteger(Number(query)) ? [{ citaId: Number(query) }] : []),
          {
            cita: {
              paciente: {
                usuario: {
                  OR: [
                    { nombre: { contains: query, mode: "insensitive" } },
                    { apellido: { contains: query, mode: "insensitive" } },
                  ],
                },
              },
            },
          },
        ],
      }),
    },
    include: {
      cita: {
        include: {
          paciente: { include: { usuario: true } },
          medico: { include: { usuario: true, especialidad: true } },
        },
      },
    },
    orderBy: { creadoEn: "desc" },
  });

  return sanitize(
    pagos.map((pago) => ({
      ...pago,
      monto: Number(pago.monto),
      costoEstandar: getCostoEspecialidad(pago.cita.medico.especialidad.nombre),
    })),
  );
};

export const marcarPagoPagadoAdminService = async ({ req, id }) => {
  try {
    const pago = await prisma.pago.update({
      where: { id },
      data: { estado: "PAGADO" },
    });
    await registrarAuditoriaSeguro(req, {
      accion: "MARCAR_PAGO_PAGADO",
      modulo: "Pagos",
      entidad: "Pago",
      entidadId: pago.id,
      detalle: {
        citaId: pago.citaId,
        monto: Number(pago.monto),
        estado: "PAGADO",
      },
    });

    return { ...pago, monto: Number(pago.monto) };
  } catch (err) {
    if (err.code === "P2025") {
      throw new NotFoundError("Pago no encontrado.");
    }
    throw err;
  }
};
