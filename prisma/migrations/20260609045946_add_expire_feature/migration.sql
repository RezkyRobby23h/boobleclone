/*
  Warnings:

  - Made the column `ingredientSkuId` on table `Ingredient` required.
  - Made the column `ingredientSkuId` on table `RecipeBOM` required.

*/

-- Step 1: Create a default IngredientSku for existing data that has no SKU mapping
INSERT INTO "IngredientSku" ("id", "sku", "name", "unit", "createdAt", "updatedAt")
VALUES ('default-legacy-sku', 'LEGACY', 'Legacy Bahan Baku (Auto-Migrated)', 'unit', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("sku") DO NOTHING;

-- Step 2: Update existing Ingredient rows that have NULL ingredientSkuId
UPDATE "Ingredient" SET "ingredientSkuId" = 'default-legacy-sku' WHERE "ingredientSkuId" IS NULL;

-- Step 3: Update existing RecipeBOM rows that have NULL ingredientSkuId
UPDATE "RecipeBOM" SET "ingredientSkuId" = 'default-legacy-sku' WHERE "ingredientSkuId" IS NULL;

-- Step 4: Now safely make columns NOT NULL
ALTER TABLE "Ingredient" ALTER COLUMN "ingredientSkuId" SET NOT NULL;

-- AlterTable
ALTER TABLE "RecipeBOM" ALTER COLUMN "ingredientSkuId" SET NOT NULL;
