-- DropForeignKey
ALTER TABLE "consultas" DROP CONSTRAINT "consultas_citaId_fkey";

-- AlterTable
ALTER TABLE "consultas" ALTER COLUMN "citaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "citas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
