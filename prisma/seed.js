import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const COSTOS = {
  "Medicina General": 120,
  Cardiologia: 200,
  Cardiología: 200,
  Pediatria: 150,
  Pediatría: 150,
  Dermatologia: 180,
  Dermatología: 180,
};

const hash = (password) => bcrypt.hash(password, 10);

const slot = (daysFromToday, hour, minute = 0) => {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysFromToday,
      hour,
      minute,
      0,
      0,
    ),
  );
};

const pagoPorEstado = (estado) => {
  if (estado === "COMPLETADA") {
    return { estado: "PAGADO", metodoPago: "TARJETA" };
  }
  if (estado === "CANCELADA") {
    return { estado: "FALLIDO", metodoPago: "EFECTIVO" };
  }
  return { estado: "PENDIENTE", metodoPago: "EFECTIVO" };
};

async function limpiarBase() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      pagos,
      recetas,
      consultas,
      citas,
      historial_medico,
      alergias,
      medicamentos,
      pacientes,
      medicos,
      usuarios,
      especialidades,
      roles
    RESTART IDENTITY CASCADE
  `);
}

async function crearRoles() {
  const data = [
    { nombre: "ADMIN", descripcion: "Administrador del sistema" },
    { nombre: "MEDICO", descripcion: "Medico de la clinica" },
    { nombre: "PACIENTE", descripcion: "Paciente de la clinica" },
  ];

  await prisma.rol.createMany({ data });

  const roles = await prisma.rol.findMany();
  return Object.fromEntries(roles.map((rol) => [rol.nombre, rol]));
}

async function crearEspecialidades() {
  const data = [
    {
      nombre: "Medicina General",
      descripcion: "Atencion primaria y control general",
    },
    { nombre: "Cardiologia", descripcion: "Atencion cardiovascular" },
    { nombre: "Pediatria", descripcion: "Atencion medica infantil" },
    { nombre: "Dermatologia", descripcion: "Atencion de piel" },
  ];

  await prisma.especialidad.createMany({ data });

  const especialidades = await prisma.especialidad.findMany();
  return Object.fromEntries(
    especialidades.map((especialidad) => [especialidad.nombre, especialidad]),
  );
}

async function crearAdmin(roles) {
  return prisma.usuario.create({
    data: {
      nombre: "Laura",
      apellido: "Administrador",
      email: "admin@clinicaluz.test",
      contrasena: await hash("Admin1234"),
      estado: "ACTIVO",
      rolId: roles.ADMIN.id,
      emailVerificado: true,
    },
  });
}

async function crearPacientes(roles) {
  const pacientesSeed = [
    {
      usuario: {
        nombre: "Juan",
        apellido: "Garcia",
        email: "juan.garcia@clinicaluz.test",
        contrasena: "Paciente1234",
      },
      paciente: {
        dni: "12345678",
        telefono: "999111222",
        direccion: "Av. Los Olivos 123, Lima",
        fechaNacimiento: new Date("2004-04-01"),
        genero: "MASCULINO",
        grupoSanguineo: "O+",
        peso: 65,
        altura: 168,
        presionArterial: "120/80",
      },
      alergias: [{ nombre: "Penicilina", severidad: "SEVERO" }],
      medicamentos: [
        {
          nombre: "Loratadina",
          dosis: "10mg",
          frecuencia: "Una vez al dia",
          instrucciones: "En caso de alergias",
          diasRestantes: 12,
          activo: true,
        },
      ],
      historial:
        "Paciente estable. Antecedentes respiratorios leves controlados.",
    },
    {
      usuario: {
        nombre: "Mariana",
        apellido: "Lopez",
        email: "mariana.lopez@clinicaluz.test",
        contrasena: "Paciente1234",
      },
      paciente: {
        dni: "87654321",
        telefono: "999333444",
        direccion: "Jr. San Martin 456, Lima",
        fechaNacimiento: new Date("1992-08-15"),
        genero: "FEMENINO",
        grupoSanguineo: "A+",
        peso: 58,
        altura: 162,
        presionArterial: "118/76",
      },
      alergias: [{ nombre: "Citricos", severidad: "LEVE" }],
      medicamentos: [
        {
          nombre: "Paracetamol",
          dosis: "500mg",
          frecuencia: "Cada 8 horas",
          instrucciones: "Tomar despues de alimentos",
          diasRestantes: 5,
          activo: true,
        },
      ],
      historial: "Paciente sin antecedentes cronicos relevantes.",
    },
  ];

  const pacientes = [];

  for (const item of pacientesSeed) {
    const usuario = await prisma.usuario.create({
      data: {
        nombre: item.usuario.nombre,
        apellido: item.usuario.apellido,
        email: item.usuario.email,
        contrasena: await hash(item.usuario.contrasena),
        estado: "ACTIVO",
        rolId: roles.PACIENTE.id,
        emailVerificado: true,
      },
    });

    const paciente = await prisma.paciente.create({
      data: {
        ...item.paciente,
        usuarioId: usuario.id,
      },
    });

    await prisma.historialMedico.create({
      data: {
        pacienteId: paciente.id,
        notasGenerales: item.historial,
      },
    });

    await prisma.alergias.createMany({
      data: item.alergias.map((alergia) => ({
        ...alergia,
        pacienteId: paciente.id,
      })),
    });

    await prisma.medicamentos.createMany({
      data: item.medicamentos.map((medicamento) => ({
        ...medicamento,
        pacienteId: paciente.id,
      })),
    });

    pacientes.push({ usuario, paciente });
  }

  return pacientes;
}

async function crearMedicos(roles, especialidades) {
  const medicosSeed = [
    {
      nombre: "Marco",
      apellido: "Rios",
      email: "marco.rios@clinicaluz.test",
      contrasena: "Doctor1234",
      numeroColegiatura: "CMP-1001",
      telefono: "988100100",
      especialidad: "Medicina General",
    },
    {
      nombre: "Ana",
      apellido: "Torres",
      email: "ana.torres@clinicaluz.test",
      contrasena: "Doctor1234",
      numeroColegiatura: "CMP-1002",
      telefono: "988200200",
      especialidad: "Cardiologia",
    },
    {
      nombre: "Pedro",
      apellido: "Ramos",
      email: "pedro.ramos@clinicaluz.test",
      contrasena: "Doctor1234",
      numeroColegiatura: "CMP-1003",
      telefono: "988300300",
      especialidad: "Pediatria",
    },
  ];

  const medicos = [];

  for (const item of medicosSeed) {
    const usuario = await prisma.usuario.create({
      data: {
        nombre: item.nombre,
        apellido: item.apellido,
        email: item.email,
        contrasena: await hash(item.contrasena),
        estado: "ACTIVO",
        rolId: roles.MEDICO.id,
        emailVerificado: true,
      },
    });

    const medico = await prisma.medico.create({
      data: {
        numeroColegiatura: item.numeroColegiatura,
        telefono: item.telefono,
        estado: "ACTIVO",
        usuarioId: usuario.id,
        especialidadId: especialidades[item.especialidad].id,
      },
      include: { especialidad: true },
    });

    medicos.push({ usuario, medico });
  }

  return medicos;
}

async function crearCitasYPagos(pacientes, medicos) {
  const citasSeed = [
    {
      paciente: pacientes[0].paciente,
      medico: medicos[0].medico,
      fecha: slot(1, 9),
      estado: "PENDIENTE",
      motivo: "Control general",
    },
    {
      paciente: pacientes[1].paciente,
      medico: medicos[0].medico,
      fecha: slot(2, 10, 30),
      estado: "CONFIRMADA",
      motivo: "Seguimiento de presion arterial",
    },
    {
      paciente: pacientes[0].paciente,
      medico: medicos[1].medico,
      fecha: slot(3, 14),
      estado: "PENDIENTE",
      motivo: "Evaluacion cardiologica",
    },
    {
      paciente: pacientes[1].paciente,
      medico: medicos[2].medico,
      fecha: slot(4, 11),
      estado: "PENDIENTE",
      motivo: "Consulta pediatrica familiar",
    },
    {
      paciente: pacientes[0].paciente,
      medico: medicos[0].medico,
      fecha: slot(-7, 9),
      estado: "COMPLETADA",
      motivo: "Control preventivo",
    },
    {
      paciente: pacientes[1].paciente,
      medico: medicos[1].medico,
      fecha: slot(-5, 15),
      estado: "CANCELADA",
      motivo: "Chequeo cardiovascular",
    },
  ];

  for (const item of citasSeed) {
    const cita = await prisma.cita.create({
      data: {
        pacienteId: item.paciente.id,
        medicoId: item.medico.id,
        fecha: item.fecha,
        estado: item.estado,
        motivo: item.motivo,
      },
    });

    const pago = pagoPorEstado(item.estado);
    await prisma.pago.create({
      data: {
        citaId: cita.id,
        monto: COSTOS[item.medico.especialidad.nombre] ?? 100,
        metodoPago: pago.metodoPago,
        estado: pago.estado,
      },
    });
  }

  const historialJuan = await prisma.historialMedico.findUnique({
    where: { pacienteId: pacientes[0].paciente.id },
  });

  await prisma.consulta.create({
    data: {
      historialMedicoId: historialJuan.id,
      diagnostico: "Control preventivo estable",
      tratamiento: "Mantener habitos saludables y seguimiento anual",
      notas: "Presion arterial dentro del rango normal",
      creadoEn: slot(-30, 10),
    },
  });
}

async function main() {
  await limpiarBase();

  const roles = await crearRoles();
  const especialidades = await crearEspecialidades();
  const admin = await crearAdmin(roles);
  const pacientes = await crearPacientes(roles);
  const medicos = await crearMedicos(roles, especialidades);
  await crearCitasYPagos(pacientes, medicos);

  console.log("Seed de pruebas reales creado correctamente.");
  console.log(
    JSON.stringify(
      {
        administrador: {
          email: admin.email,
          contrasena: "Admin1234",
          usuarioId: admin.id,
        },
        pacientes: pacientes.map(({ usuario, paciente }) => ({
          email: usuario.email,
          contrasena: "Paciente1234",
          usuarioId: usuario.id,
          pacienteId: paciente.id,
        })),
        doctores: medicos.map(({ usuario, medico }) => ({
          email: usuario.email,
          contrasena: "Doctor1234",
          usuarioId: usuario.id,
          medicoId: medico.id,
          especialidad: medico.especialidad.nombre,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
