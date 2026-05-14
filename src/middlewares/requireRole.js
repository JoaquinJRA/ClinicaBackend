export const requireRole = (role) => (req, _res, next) => {
  if (!req.user) throw new ForbiddenError("No has iniciado sesión.");
  const userRole = req.user.role;

  if (userRole !== role)
    throw new ForbiddenError("No tienes permisos para realizar esta acción");

  next();
};
