import { jest } from "@jest/globals";
import request from "supertest";
import app from "../../app.js";
import { prisma } from "../../../prisma/client.js";
jest.setTimeout(15000);

const TEST_TAG = "inttest"; 


let rolPacienteId;
let rolMedicoId;
let especialidadId;
let medicoId;
let pacienteId;

beforeAll(async () => {
  // Roles 
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


// Metodo POST - Citas


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

    
    const primera = await request(app).post("/api/citas").send({
      pacienteId,
      medicoId,
      fecha,
      motivo: "Primera cita",
    });
    expect(primera.status).toBe(201);

    
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
      fecha: "15-06-2099 10:00",
      motivo: "Consulta",
    });

    expect(response.status).toBe(400);
  });

  test("CI07: rechaza un horario fuera de los slots permitidos (400)", async () => {
    const response = await request(app).post("/api/citas").send({
      pacienteId,
      medicoId,
      fecha: "2099-06-15T10:15", 
      motivo: "Consulta",
    });

    expect(response.status).toBe(400);
  });
});

// API Citas - PacienteId


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