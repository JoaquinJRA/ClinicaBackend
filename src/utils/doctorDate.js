import { BadRequestError } from "./appError.js";

export const parseFechaDia = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    throw new BadRequestError("Fecha invalida.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestError("Fecha invalida.");
  }

  return date;
};

export const inicioDiaUtc = (value) => {
  const date = parseFechaDia(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

export const finDiaUtc = (value) => {
  const date = parseFechaDia(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
};

export const parseFechaCita = (value) => {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value,
  );

  if (match) {
    const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw = "00"] =
      match;
    return new Date(
      Date.UTC(
        Number(yearRaw),
        Number(monthRaw) - 1,
        Number(dayRaw),
        Number(hourRaw),
        Number(minuteRaw),
        Number(secondRaw),
        0,
      ),
    );
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError("nuevaFecha invalida.");
  }
  return date;
};

export const formatHoraUtc = (date) => {
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
};
