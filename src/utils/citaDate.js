import { BadRequestError } from "./appError.js";
import { SLOTS } from "./adminCatalogs.js";

export const formatDateKey = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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

export const buildSlotDate = (baseDate, time) => {
  const [hour, minute] = time.split(":").map(Number);
  return new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      hour,
      minute,
      0,
      0,
    ),
  );
};

export const getSlotTime = (date) => {
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
};

export const isValidSlotDate = (date) => {
  return (
    SLOTS.includes(getSlotTime(date)) &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
};

export const parseFechaCita = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value || "",
  );

  if (!match) {
    throw new BadRequestError("Fecha invalida.");
  }

  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw = "00"] =
    match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw);
  const localDate = new Date(year, month - 1, day, hour, minute, second, 0);
  const dbDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second, 0));

  if (
    localDate.getFullYear() !== year ||
    localDate.getMonth() !== month - 1 ||
    localDate.getDate() !== day ||
    localDate.getHours() !== hour ||
    localDate.getMinutes() !== minute ||
    localDate.getSeconds() !== second
  ) {
    throw new BadRequestError("Fecha invalida.");
  }

  return { dbDate, localDate };
};
