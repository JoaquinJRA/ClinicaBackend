-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER,
    "usuarioNombre" VARCHAR(200) NOT NULL,
    "rol" VARCHAR(50) NOT NULL,
    "accion" VARCHAR(100) NOT NULL,
    "modulo" VARCHAR(80) NOT NULL,
    "entidad" VARCHAR(80),
    "entidadId" INTEGER,
    "detalle" JSONB,
    "ip" VARCHAR(80),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auditoria_modulo_idx" ON "auditoria"("modulo");

-- CreateIndex
CREATE INDEX "auditoria_accion_idx" ON "auditoria"("accion");

-- CreateIndex
CREATE INDEX "auditoria_creadoEn_idx" ON "auditoria"("creadoEn");
