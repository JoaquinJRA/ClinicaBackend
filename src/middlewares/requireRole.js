import { ForbiddenError } from "../utils/appError.js";

export const requireRole = (role) => (req, _res, next) => {
  if (!req.user) throw new ForbiddenError("No has iniciado sesion.");

  const userRole = req.user.rol || req.user.role;

  if (userRole !== role) {
    throw new ForbiddenError("No tienes permisos para realizar esta accion");
  }

  next();
};
