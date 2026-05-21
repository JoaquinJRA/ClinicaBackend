import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // ── Roles ─────────────────────────────────────────────
  await prisma.rol.createMany({
    data: [
      { nombre: "ADMIN", descripcion: "Administrador del sistema" },
      { nombre: "MEDICO", descripcion: "Médico del sistema" },
      { nombre: "PACIENTE", descripcion: "Paciente de la clínica" },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Roles creados.");

  const rolAdmin = await prisma.rol.findUnique({ where: { nombre: "ADMIN" } });
  const rolMedico = await prisma.rol.findUnique({
    where: { nombre: "MEDICO" },
  });
  const rolPaciente = await prisma.rol.findUnique({
    where: { nombre: "PACIENTE" },
  });

  // ── Admin ──────────────────────────────────────────────
  await prisma.usuario.upsert({
    where: { email: "admin@clinicaluz.com" },
    update: {},
    create: {
      nombre: "Admin",
      apellido: "Sistema",
      email: "admin@clinicaluz.com",
      contrasena: await bcrypt.hash("admin1234", 10),
      rolId: rolAdmin.id,
    },
  });

  console.log("✅ Usuario admin creado.");

  // ── Médico ─────────────────────────────────────────────
  const especialidad = await prisma.especialidad.upsert({
    where: { nombre: "Medicina General" },
    update: {},
    create: {
      nombre: "Medicina General",
      descripcion: "Atención médica general",
    },
  });

  const medicoUsuario = await prisma.usuario.upsert({
    where: { email: "medico@clinicaluz.com" },
    update: {},
    create: {
      nombre: "Juan",
      apellido: "Pérez",
      email: "medico@clinicaluz.com",
      contrasena: await bcrypt.hash("medico1234", 10),
      rolId: rolMedico.id,
    },
  });

  await prisma.medico.upsert({
    where: { usuarioId: medicoUsuario.id },
    update: {},
    create: {
      numeroColegiatura: "CMP-001234",
      telefono: "+51999000111",
      usuarioId: medicoUsuario.id,
      especialidadId: especialidad.id,
    },
  });

  console.log("✅ Usuario médico creado.");

  // ── Paciente ───────────────────────────────────────────
  const pacienteUsuario = await prisma.usuario.upsert({
    where: { email: "paciente@clinicaluz.com" },
    update: {},
    create: {
      nombre: "María",
      apellido: "López",
      email: "paciente@clinicaluz.com",
      contrasena: await bcrypt.hash("paciente1234", 10),
      rolId: rolPaciente.id,
    },
  });

  await prisma.paciente.upsert({
    where: { usuarioId: pacienteUsuario.id },
    update: {},
    create: {
      dni: "87654321",
      telefono: "+51999000222",
      direccion: "Av. Luz 456, Lima",
      fechaNacimiento: new Date("1990-03-20"),
      genero: "FEMENINO",
      usuarioId: pacienteUsuario.id,
    },
  });

  console.log("Usuario paciente creado.");
  console.log("\n🎉 Seed completado correctamente.");
  console.log("─────────────────────────────────");
  console.log("Admin    → admin@clinicaluz.com    / admin1234");
  console.log("Médico   → medico@clinicaluz.com   / medico1234");
  console.log("Paciente → paciente@clinicaluz.com / paciente1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
