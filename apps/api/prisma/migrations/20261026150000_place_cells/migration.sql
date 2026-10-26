-- CreateTable
-- Cache dos postos do OpenStreetMap por célula do geohash (5 caracteres). Tabela nova, sem usuário:
-- o app anterior não a usa.
CREATE TABLE "place_cells" (
    "geohash" VARCHAR(5) NOT NULL,
    "places" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_cells_pkey" PRIMARY KEY ("geohash")
);
