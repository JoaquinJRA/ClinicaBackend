import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.role.createMany({
    data: [
      {
        name: "ADMIN",
        description: "Administrador del sistema",
      },
      {
        name: "DOCTOR",
        description: "Médico",
      },
      {
        name: "PATIENT",
        description: "Paciente",
      },
      {
        name: "RECEPTION",
        description: "Recepción",
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
