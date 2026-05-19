import { prisma } from "./client.js";

async function main() {
  await prisma.rol.createMany({
    data: [
      {
        nombre: "ADMIN",
        descripcion: "Administrador del sistema",
      },
      {
        nombre: "DOCTOR",
        descripcion: "Médico",
      },
      {
        nombre: "PACIENTE",
        descripcion: "Paciente",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Roles creados correctamente.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
