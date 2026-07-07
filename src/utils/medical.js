export const calcularDiasRestantes = (duracion, unidadDuracion) => {
  const cantidad = Number(duracion);
  if (!Number.isInteger(cantidad) || cantidad <= 0) return null;

  const unidad = String(unidadDuracion || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (unidad === "dias") return cantidad;
  if (unidad === "semanas") return cantidad * 7;
  if (unidad === "meses") return cantidad * 30;
  return null;
};

export const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return null;

  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getUTCFullYear();
  const mes = hoy.getMonth() - fechaNacimiento.getUTCMonth();

  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getUTCDate())) {
    edad -= 1;
  }

  return edad;
};

export const formatPrescripcion = (medicamento) => {
  const partes = [
    `${medicamento.nombre} ${medicamento.dosis}`,
    medicamento.frecuencia,
    medicamento.fechaInicio ? `Inicio: ${medicamento.fechaInicio}` : null,
    medicamento.duracion && medicamento.unidadDuracion
      ? `Duracion: ${medicamento.duracion} ${medicamento.unidadDuracion}`
      : null,
    medicamento.instrucciones,
  ].filter(Boolean);

  return partes.join(" | ");
};
