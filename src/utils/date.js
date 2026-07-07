import { BadRequestError } from "./appError.js";

export const getInicioDiaLocal = (value = new Date()) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError("Fecha invalida.");
  }

  date.setHours(0, 0, 0, 0);
  return date;
};
