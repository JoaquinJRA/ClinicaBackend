import jwt from "jsonwebtoken";
import { ForbiddenError, UnauthorizedError } from "../utils/appError.js";

export const verifySession = async (req, _res, next) => {
  try {
    const bearerToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    const token = req.cookies.token || bearerToken;

    if (!token) {
      throw new UnauthorizedError("No se ha proporcionado un token.");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) return next(err);
    next(new ForbiddenError("Token no valido"));
  }
};
