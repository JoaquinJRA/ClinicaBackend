import { ForbiddenError, UnauthorizedError } from "../utils/appError";
import jwt from "jsonwebtoken";

export const verifySession = async (req, _res, next) => {
  if (!req.cookies.token)
    throw new UnauthorizedError("No se ha proporcionado un token.");

  const token = req.cookies.token;

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    throw new ForbiddenError("Token no válido");
  }
};
