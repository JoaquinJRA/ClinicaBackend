ALTER TABLE "consultas" ADD COLUMN "medicoId" INTEGER;

ALTER TABLE "consultas"
ADD CONSTRAINT "consultas_medicoId_fkey"
FOREIGN KEY ("medicoId") REFERENCES "medicos"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
