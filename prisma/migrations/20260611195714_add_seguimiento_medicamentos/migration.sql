-- CreateTable
CREATE TABLE "seguimiento_medicamentos" (
    "id" SERIAL NOT NULL,
    "medicamentoId" INTEGER NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" VARCHAR(20) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seguimiento_medicamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seguimiento_medicamentos_medicamentoId_pacienteId_fecha_key" ON "seguimiento_medicamentos"("medicamentoId", "pacienteId", "fecha");

-- AddForeignKey
ALTER TABLE "seguimiento_medicamentos" ADD CONSTRAINT "seguimiento_medicamentos_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "medicamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimiento_medicamentos" ADD CONSTRAINT "seguimiento_medicamentos_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
