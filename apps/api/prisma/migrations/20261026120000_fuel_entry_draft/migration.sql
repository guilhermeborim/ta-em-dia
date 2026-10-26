-- CreateEnum
CREATE TYPE "FuelEntryStatus" AS ENUM ('complete', 'draft');

-- AlterTable
-- Rascunho de abastecimento: só guarda o que se sabe, então estas colunas passam a aceitar nulo.
-- Os abastecimentos que já existem ficam 'complete'. Compatível com a versão anterior do app.
ALTER TABLE "fuel_entries" ADD COLUMN     "status" "FuelEntryStatus" NOT NULL DEFAULT 'complete',
ALTER COLUMN "km" DROP NOT NULL,
ALTER COLUMN "fuelType" DROP NOT NULL,
ALTER COLUMN "liters" DROP NOT NULL,
ALTER COLUMN "pricePerLiter" DROP NOT NULL,
ALTER COLUMN "total" DROP NOT NULL,
ALTER COLUMN "fullTank" DROP NOT NULL;
