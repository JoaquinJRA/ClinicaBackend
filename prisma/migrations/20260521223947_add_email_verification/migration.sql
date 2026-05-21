/*
  Warnings:

  - A unique constraint covering the columns `[tokenVerificacion]` on the table `usuarios` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tokenVerificacion" VARCHAR(255),
ADD COLUMN     "tokenVerificacionExp" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tokenVerificacion_key" ON "usuarios"("tokenVerificacion");
