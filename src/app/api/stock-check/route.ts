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
          include: { ingredient: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check each ingredient stock
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
      const available = recipe.ingredient.stock;
      const possibleQty = Math.floor(available / recipe.quantity);

      if (possibleQty < maxQuantity) {
        maxQuantity = possibleQty;
      }

      if (available < required) {
        stockIssues.push({
          ingredientId: recipe.ingredientId,
          name: recipe.ingredient.name,
          required,
          available,
          unit: recipe.ingredient.unit,
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