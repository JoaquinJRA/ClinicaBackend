export const errorHandler = (err, _req, res, _next) => {
  if (process.env.NODE_ENV !== "test") {
    console.error(err);
  }
  return res.status(err.statusCode || 500).json({
    name: err.name,
    message: err.message || "Error interno del servidor",
  });
};