-- AlterTable
ALTER TABLE "pacientes"
ADD COLUMN "tipoSangre" VARCHAR(5),
ADD COLUMN "grupo_sanguineo" TEXT,
ADD COLUMN "peso" DOUBLE PRECISION,
ADD COLUMN "altura" DOUBLE PRECISION,
ADD COLUMN "presion_arterial" TEXT,
ADD COLUMN "antecedentesMedicos" TEXT,
ADD COLUMN "contactoEmergenciaNombre" VARCHAR(100),
ADD COLUMN "contactoEmergenciaTelefono" VARCHAR(20);

-- CreateTable
CREATE TABLE "alergias" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "severidad" VARCHAR(20) NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alergias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicamentos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "dosis" VARCHAR(50) NOT NULL,
    "instrucciones" VARCHAR(255) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "pacienteId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "citas_medicoId_fecha_key" ON "citas"("medicoId", "fecha");

-- AddForeignKey
ALTER TABLE "alergias" ADD CONSTRAINT "alergias_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicamentos" ADD CONSTRAINT "medicamentos_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Appointment slots: 09:00 through 17:30, every 30 minutes.
ALTER TABLE "citas" ADD CONSTRAINT "citas_fecha_slot_check"
CHECK (
    EXTRACT(HOUR FROM "fecha") BETWEEN 9 AND 17
    AND EXTRACT(MINUTE FROM "fecha") IN (0, 30)
    AND EXTRACT(SECOND FROM "fecha") = 0
    AND (
        EXTRACT(HOUR FROM "fecha") < 17
        OR EXTRACT(MINUTE FROM "fecha") <= 30
    )
);
