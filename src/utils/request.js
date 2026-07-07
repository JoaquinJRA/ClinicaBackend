import { BadRequestError } from "./appError.js";

export const toPositiveId = (value, field = "id") => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestError(`${field} invalido.`);
  }
  return id;
};

export const pickAllowedFields = (body, allowedFields) => {
  return allowedFields.reduce((data, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = body[field];
    }
    return data;
  }, {});
};
