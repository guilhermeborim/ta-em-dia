-- CreateTable
-- Postos do usuário (Fase C). Tabela nova: o app anterior não a usa (o pull do protocolo 1 não a
-- manda). Posto local não guarda lat/lng aqui (ficam só no aparelho).
CREATE TABLE "stations" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "osmId" TEXT,
    "name" TEXT,
    "brand" TEXT,
    "street" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" BIGINT NOT NULL,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stations_userId_version_idx" ON "stations"("userId", "version");

-- AddForeignKey
ALTER TABLE "stations" ADD CONSTRAINT "stations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
-- Posto do abastecimento (opcional, sem chave estrangeira). Só adiciona: o app anterior segue
-- mandando só `stationName`.
ALTER TABLE "fuel_entries" ADD COLUMN     "stationId" UUID;
