import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, quantity } = body as {
      productId: string;
      quantity: number;
    };

    // Get product with BOM
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        ingredients: {
          include: {
            ingredientSku: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    const now = new Date();

    // Collect all ingredient SKU IDs needed
    const ingredientSkuIds = new Set<string>();
    for (const recipe of product.ingredients) {
      ingredientSkuIds.add(recipe.ingredientSkuId);
    }

    // Fetch all non-expired batches for each ingredient SKU
    const allBatches = await prisma.ingredient.findMany({
      where: {
        ingredientSkuId: { in: Array.from(ingredientSkuIds) },
        OR: [
          { expiryDate: null },
          { expiryDate: { gt: now } },
        ],
      },
      orderBy: { expiryDate: { sort: "asc", nulls: "last" } },
    });

    // Group batches by ingredientSkuId and sum stock
    const stockBySku = new Map<string, number>();
    for (const batch of allBatches) {
      const current = stockBySku.get(batch.ingredientSkuId) || 0;
      stockBySku.set(batch.ingredientSkuId, current + batch.stock);
    }

    // Check each ingredient stock across all active batches
    const stockIssues: {
      ingredientId: string;
      name: string;
      required: number;
      available: number;
      unit: string;
    }[] = [];

    let maxQuantity = Infinity;

    for (const recipe of product.ingredients) {
      const required = recipe.quantity * quantity;
      const available = stockBySku.get(recipe.ingredientSkuId) || 0;
      const possibleQty = Math.floor(available / recipe.quantity);

      if (possibleQty < maxQuantity) {
        maxQuantity = possibleQty;
      }

      if (available < required) {
        stockIssues.push({
          ingredientId: recipe.ingredientSkuId,
          name: recipe.ingredientSku.name,
          required,
          available,
          unit: recipe.ingredientSku.unit,
        });
      }
    }

    return NextResponse.json({
      available: stockIssues.length === 0,
      maxQuantity: Math.max(0, maxQuantity),
      stockIssues,
    });
  } catch (error) {
    console.error("POST /api/stock-check error:", error);
    return NextResponse.json(
      { error: "Gagal mengecek stok" },
      { status: 500 }
    );
  }
}