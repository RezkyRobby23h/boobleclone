-- CreateTable
CREATE TABLE "IngredientSku" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngredientSku_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IngredientSku_sku_key" ON "IngredientSku"("sku");

-- AlterTable: Add new columns to Ingredient (nullable first for migration)
ALTER TABLE "Ingredient" ADD COLUMN "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Ingredient" ADD COLUMN "expiryDate" TIMESTAMP(3);
ALTER TABLE "Ingredient" ADD COLUMN "ingredientSkuId" TEXT;

-- CreateIndex
CREATE INDEX "Ingredient_ingredientSkuId_idx" ON "Ingredient"("ingredientSkuId");

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_ingredientSkuId_fkey" FOREIGN KEY ("ingredientSkuId") REFERENCES "IngredientSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate RecipeBOM: change from ingredientId to ingredientSkuId
-- Step 1: Add new column
ALTER TABLE "RecipeBOM" ADD COLUMN "ingredientSkuId" TEXT;

-- Step 2: Populate ingredientSkuId from existing ingredient's ingredientSkuId
-- (This will only work after ingredients have been linked to IngredientSku records)
UPDATE "RecipeBOM" SET "ingredientSkuId" = (
    SELECT "ingredientSkuId" FROM "Ingredient" WHERE "Ingredient"."id" = "RecipeBOM"."ingredientId"
) WHERE "ingredientId" IS NOT NULL;

-- Step 3: Drop old unique constraint
ALTER TABLE "RecipeBOM" DROP CONSTRAINT IF EXISTS "RecipeBOM_productId_ingredientId_key";
DROP INDEX IF EXISTS "RecipeBOM_productId_ingredientId_key";

-- Step 4: Drop old foreign key and column
ALTER TABLE "RecipeBOM" DROP CONSTRAINT IF EXISTS "RecipeBOM_ingredientId_fkey";
ALTER TABLE "RecipeBOM" DROP COLUMN "ingredientId";

-- Step 5: Make ingredientSkuId NOT NULL (after data migration)
-- ALTER TABLE "RecipeBOM" ALTER COLUMN "ingredientSkuId" SET NOT NULL;

-- Step 6: Create new unique index
CREATE UNIQUE INDEX "RecipeBOM_productId_ingredientSkuId_key" ON "RecipeBOM"("productId", "ingredientSkuId");

-- Step 7: Add new foreign key
ALTER TABLE "RecipeBOM" ADD CONSTRAINT "RecipeBOM_ingredientSkuId_fkey" FOREIGN KEY ("ingredientSkuId") REFERENCES "IngredientSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;