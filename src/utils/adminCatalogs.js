export const SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
];

const COSTOS_ESPECIALIDAD = {
  "Medicina General": 120,
  Cardiologia: 200,
  "CardiologÃ­a": 200,
  Pediatria: 150,
  "PediatrÃ­a": 150,
  Dermatologia: 180,
  "DermatologÃ­a": 180,
};

export const getCostoEspecialidad = (nombre) =>
  COSTOS_ESPECIALIDAD[nombre] ?? 100;
