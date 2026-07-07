import { BadRequestError } from "./appError.js";
import { SLOTS } from "./adminCatalogs.js";

export const buildSlotDate = (fecha, hora) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || "")) {
    throw new BadRequestError("Fecha invalida.");
  }
  if (!SLOTS.includes(hora)) {
    throw new BadRequestError("Hora no valida.");
  }

  const [year, month, day] = fecha.split("-").map(Number);
  const [hour, minute] = hora.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
};

export const dayRange = (fecha) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || "")) {
    throw new BadRequestError("Fecha invalida.");
  }
  const [year, month, day] = fecha.split("-").map(Number);
  return {
    gte: new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)),
    lte: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)),
  };
};

export const monthRange = (year, month) => {
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  if (
    !Number.isInteger(parsedYear) ||
    !Number.isInteger(parsedMonth) ||
    parsedMonth < 1 ||
    parsedMonth > 12
  ) {
    throw new BadRequestError("Mes o aÃ±o invalido.");
  }

  return {
    inicio: new Date(Date.UTC(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0)),
    fin: new Date(Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59, 999)),
    dias: new Date(Date.UTC(parsedYear, parsedMonth, 0)).getUTCDate(),
    year: parsedYear,
    month: parsedMonth,
  };
};
