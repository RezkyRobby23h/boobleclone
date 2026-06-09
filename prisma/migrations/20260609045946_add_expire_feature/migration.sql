/*
  Warnings:

  - Made the column `ingredientSkuId` on table `Ingredient` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ingredientSkuId` on table `RecipeBOM` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Ingredient" ALTER COLUMN "ingredientSkuId" SET NOT NULL;

-- AlterTable
ALTER TABLE "RecipeBOM" ALTER COLUMN "ingredientSkuId" SET NOT NULL;
