-- AlterTable
ALTER TABLE "medicamentos" ADD COLUMN     "diasRestantes" INTEGER,
ADD COLUMN     "duracion" INTEGER,
ADD COLUMN     "fechaInicio" TIMESTAMP(3),
ADD COLUMN     "frecuencia" VARCHAR(100),
ADD COLUMN     "unidadDuracion" VARCHAR(20);
