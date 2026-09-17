import { jest } from "@jest/globals";
import request from "supertest";
import app from "../../app.js";
import { prisma } from "../../../prisma/client.js";

// Las pruebas de integración golpean una base de datos real (definida en
// DATABASE_URL / .env.test), por lo que necesitan más tiempo que las unitarias.
jest.setTimeout(15000);

// ============================================================
// Datos de prueba (seed) — se crean antes de todo y se limpian al final
// ============================================================

const TEST_TAG = "inttest"; // usado para identificar y limpiar solo lo que creamos aquí
// Nota: "DNI-" + TEST_TAG debe caber en VarChar(15) según el schema de Prisma

let rolPacienteId;
let rolMedicoId;
let especialidadId;
let medicoId;
let pacienteId;

beforeAll(async () => {
  // Roles (usan upsert por si ya existen de una corrida anterior)
  const rolPaciente = await prisma.rol.upsert({
    where: { nombre: "PACIENTE" },
    update: {},
    create: { nombre: "PACIENTE", descripcion: "Rol paciente" },
  });
  rolPacienteId = rolPaciente.id;

  const rolMedico = await prisma.rol.upsert({
    where: { nombre: "MEDICO" },
    update: {},
    create: { nombre: "MEDICO", descripcion: "Rol medico" },
  });
  rolMedicoId = rolMedico.id;

  // Especialidad
  const especialidad = await prisma.especialidad.upsert({
    where: { nombre: "Medicina General" },
    update: {},
    create: { nombre: "Medicina General" },
  });
  especialidadId = especialidad.id;

  // Usuario + Medico de prueba
  const usuarioMedico = await prisma.usuario.upsert({
    where: { email: `medico.${TEST_TAG}@clinica.test` },
    update: {},
    create: {
      nombre: "Doctor",
      apellido: "DePrueba",
      email: `medico.${TEST_TAG}@clinica.test`,
      contrasena: "hash-no-relevante",
      rolId: rolMedicoId,
    },
  });

  const medico = await prisma.medico.upsert({
    where: { numeroColegiatura: `CMP-${TEST_TAG}` },
    update: {},
    create: {
      numeroColegiatura: `CMP-${TEST_TAG}`,
      usuarioId: usuarioMedico.id,
      especialidadId,
    },
  });
  medicoId = medico.id;

  // Usuario + Paciente de prueba
  const usuarioPaciente = await prisma.usuario.upsert({
    where: { email: `paciente.${TEST_TAG}@clinica.test` },
    update: {},
    create: {
      nombre: "Paciente",
      apellido: "DePrueba",
      email: `paciente.${TEST_TAG}@clinica.test`,
      contrasena: "hash-no-relevante",
      rolId: rolPacienteId,
    },
  });

  const paciente = await prisma.paciente.upsert({
    where: { dni: `DNI-${TEST_TAG}` },
    update: {},
    create: {
      dni: `DNI-${TEST_TAG}`,
      genero: "OTRO",
      usuarioId: usuarioPaciente.id,
    },
  });
  pacienteId = paciente.id;
});

// Limpia las citas creadas DURANTE cada test, para que no choquen entre sí
// por la restricción @@unique([medicoId, fecha]).
afterEach(async () => {
  await prisma.pago.deleteMany({ where: { cita: { medicoId } } });
  await prisma.cita.deleteMany({ where: { medicoId } });
});

afterAll(async () => {
  await prisma.medico.delete({ where: { id: medicoId } });
  await prisma.paciente.delete({ where: { id: pacienteId } });
  await prisma.usuario.deleteMany({
    where: { email: { endsWith: `${TEST_TAG}@clinica.test` } },
  });
  await prisma.$disconnect();
});

// ============================================================
// POST /api/citas
// ============================================================

describe("POST /api/citas", () => {
  test("CI03: crea una cita correctamente (201)", async () => {
    const response = await request(app).post("/api/citas").send({
      pacienteId,
      medicoId,
      fecha: "2099-06-15T10:00",
      motivo: "Consulta de rutina",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        pacienteId,
        medicoId,
        estado: "PENDIENTE",
      })
    );

    // Confirma que también se creó el pago asociado (efecto colateral del service)
    const pago = await prisma.pago.findUnique({
      where: { citaId: response.body.id },
    });
    expect(pago).not.toBeNull();
    expect(pago.estado).toBe("PENDIENTE");
  });

  test("CI04: rechaza motivo vacío (400)", async () => {
    const response = await request(app).post("/api/citas").send({
      pacienteId,
      medicoId,
      fecha: "2099-06-15T10:30",
      motivo: "",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/motivo/i);
  });

  test("CI05: rechaza un slot ya ocupado (409)", async () => {
    const fecha = "2099-06-15T11:00";

    // Primera cita: debe crearse sin problema
    const primera = await request(app).post("/api/citas").send({
      pacienteId,
      medicoId,
      fecha,
      motivo: "Primera cita",
    });
    expect(primera.status).toBe(201);

    // Segunda cita en el mismo horario y médico: debe rechazarse
    const segunda = await request(app).post("/api/citas").send({
      pacienteId,
      medicoId,
      fecha,
      motivo: "Segunda cita",
    });

    expect(segunda.status).toBe(409);
    expect(segunda.body.message).toMatch(/no disponible/i);
  });

  test("CI06: rechaza un formato de fecha inválido (400)", async () => {
    const response = await request(app).post("/api/citas").send({
      pacienteId,
      medicoId,
      fecha: "15-06-2099 10:00", // formato incorrecto a propósito
      motivo: "Consulta",
    });

    expect(response.status).toBe(400);
  });

  test("CI07: rechaza un horario fuera de los slots permitidos (400)", async () => {
    const response = await request(app).post("/api/citas").send({
      pacienteId,
      medicoId,
      fecha: "2099-06-15T10:15", // 10:15 no está en SLOTS (solo :00 y :30)
      motivo: "Consulta",
    });

    expect(response.status).toBe(400);
  });
});

// ============================================================
// GET /api/citas/paciente/:pacienteId
// ============================================================

describe("GET /api/citas/paciente/:pacienteId", () => {
  test("CI08: devuelve las citas del paciente recién creadas", async () => {
    await request(app).post("/api/citas").send({
      pacienteId,
      medicoId,
      fecha: "2099-06-16T09:00",
      motivo: "Consulta de seguimiento",
    });

    const response = await request(app).get(`/api/citas/paciente/${pacienteId}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(
      response.body.some((c) => c.motivo === "Consulta de seguimiento")
    ).toBe(true);
  });
});