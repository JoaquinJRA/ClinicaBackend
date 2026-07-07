import { prisma } from "../../../prisma/client.js";
import { SLOTS } from "../../utils/adminCatalogs.js";
import { monthRange } from "../../utils/adminDate.js";

export const getOcupacionMedicaAdminService = async ({ year, month }) => {
  const now = new Date();
  const periodo = monthRange(
    year || now.getUTCFullYear(),
    month || now.getUTCMonth() + 1,
  );
  const { inicio, fin, dias } = periodo;

  const [especialidades, medicos, citas] = await Promise.all([
    prisma.especialidad.findMany({
      orderBy: { nombre: "asc" },
    }),
    prisma.medico.findMany({
      where: { estado: "ACTIVO" },
      include: { usuario: true, especialidad: true },
      orderBy: { id: "asc" },
    }),
    prisma.cita.findMany({
      where: {
        fecha: { gte: inicio, lte: fin },
        estado: { not: "CANCELADA" },
      },
      include: {
        medico: { include: { especialidad: true, usuario: true } },
      },
    }),
  ]);

  const fechaKey = (fecha) => fecha.toISOString().slice(0, 10);
  const slotKey = (fecha) =>
    `${String(fecha.getUTCHours()).padStart(2, "0")}:${String(
      fecha.getUTCMinutes(),
    ).padStart(2, "0")}`;

  const totalSlotsMes = medicos.length * SLOTS.length * dias;
  const diasData = Array.from({ length: dias }, (_, index) => {
    const fecha = new Date(Date.UTC(periodo.year, periodo.month - 1, index + 1));
    const key = fechaKey(fecha);
    const slotsOcupados = citas.filter((cita) => fechaKey(cita.fecha) === key)
      .length;
    const totalSlots = medicos.length * SLOTS.length;
    const ocupacion = totalSlots
      ? Math.round((slotsOcupados / totalSlots) * 100)
      : 0;

    return {
      fecha: key,
      slotsOcupados,
      totalSlots,
      ocupacion,
      demanda:
        ocupacion >= 70
          ? "ALTA"
          : ocupacion >= 35
            ? "MEDIA"
            : "BAJA",
    };
  });

  const horarios = SLOTS.map((hora) => {
    const total = citas.filter((cita) => slotKey(cita.fecha) === hora).length;
    const totalSlots = medicos.length * dias;
    return {
      hora,
      total,
      ocupacion: totalSlots ? Math.round((total / totalSlots) * 100) : 0,
    };
  }).sort((a, b) => b.total - a.total);

  const especialidadesData = especialidades.map((especialidad) => {
    const medicosEspecialidad = medicos.filter(
      (medico) => medico.especialidadId === especialidad.id,
    );
    const citasEspecialidad = citas.filter(
      (cita) => cita.medico.especialidadId === especialidad.id,
    );
    const totalSlots = medicosEspecialidad.length * SLOTS.length * dias;
    return {
      id: especialidad.id,
      nombre: especialidad.nombre,
      medicosActivos: medicosEspecialidad.length,
      citas: citasEspecialidad.length,
      totalSlots,
      ocupacion: totalSlots
        ? Math.round((citasEspecialidad.length / totalSlots) * 100)
        : 0,
      sinMedicos: medicosEspecialidad.length === 0,
    };
  });

  const medicosData = medicos
    .map((medico) => {
      const citasMedico = citas.filter((cita) => cita.medicoId === medico.id);
      const totalSlots = SLOTS.length * dias;
      const ocupacion = totalSlots
        ? Math.round((citasMedico.length / totalSlots) * 100)
        : 0;
      return {
        id: medico.id,
        nombre: `${medico.usuario.nombre} ${medico.usuario.apellido}`,
        especialidad: medico.especialidad.nombre,
        citas: citasMedico.length,
        totalSlots,
        ocupacion,
        pocosTurnos: citasMedico.length <= 2,
      };
    })
    .sort((a, b) => a.citas - b.citas);

  return {
    periodo: { year: periodo.year, month: periodo.month, dias },
    resumen: {
      totalCitas: citas.length,
      totalMedicos: medicos.length,
      totalEspecialidades: especialidades.length,
      totalSlots: totalSlotsMes,
      ocupacionGeneral: totalSlotsMes
        ? Math.round((citas.length / totalSlotsMes) * 100)
        : 0,
      especialidadesSinMedicos: especialidadesData.filter((item) => item.sinMedicos),
      medicosConPocosTurnos: medicosData.filter((item) => item.pocosTurnos),
    },
    dias: diasData,
    horarios,
    especialidades: especialidadesData,
    medicos: medicosData,
  };
};
