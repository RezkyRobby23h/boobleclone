import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ingredientSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  sku: z.string().min(1, "SKU wajib diisi"),
  stock: z.coerce.number().min(0, "Stok tidak boleh negatif"),
  minimumStock: z.coerce.number().min(0, "Stok minimum tidak boleh negatif"),
  unit: z.string().min(1, "Satuan wajib diisi").optional(),
  costPerUnit: z.coerce.number().min(0, "Harga tidak boleh negatif"),
  entryDate: z.string().optional(),
  expiryDate: z.string().optional().nullable(),
  ingredientSkuId: z.string().min(1, "SKU bahan baku wajib dipilih"),
});

export async function GET() {
  try {
    const ingredients = await prisma.ingredient.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        ingredientSku: true,
      },
    });
    return NextResponse.json(ingredients);
  } catch (error) {
    console.error("GET /api/ingredients error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data bahan baku" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ingredientSchema.parse(body);

    const existing = await prisma.ingredient.findUnique({
      where: { sku: validated.sku },
    });

    if (existing) {
      return NextResponse.json(
        { error: `SKU "${validated.sku}" sudah digunakan` },
        { status: 400 }
      );
    }

    // Ambil unit dari IngredientSku jika tidak dikirim dari frontend
    let unit = validated.unit;
    if (!unit) {
      const sku = await prisma.ingredientSku.findUnique({
        where: { id: validated.ingredientSkuId },
      });
      if (!sku) {
        return NextResponse.json(
          { error: "SKU bahan baku tidak ditemukan" },
          { status: 400 }
        );
      }
      unit = sku.unit;
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        name: validated.name,
        sku: validated.sku,
        stock: validated.stock,
        minimumStock: validated.minimumStock,
        unit: unit,
        costPerUnit: validated.costPerUnit,
        entryDate: validated.entryDate ? new Date(validated.entryDate) : new Date(),
        expiryDate: validated.expiryDate ? new Date(validated.expiryDate) : null,
        ingredientSkuId: validated.ingredientSkuId,
      },
      include: {
        ingredientSku: true,
      },
    });

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("POST /api/ingredients error:", error);
    return NextResponse.json(
      { error: "Gagal membuat bahan baku" },
      { status: 500 }
    );
  }
}