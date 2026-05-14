export const errorHandler = (err, _req, res, _next) => {
  console.error(err);
  return res.status(err.statusCode || 500).json({
    name: err.name,
    message: err.message || "Error interno del servidor",
  });
};
