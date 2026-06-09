import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ingredientUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  stock: z.coerce.number().min(0).optional(),
  minimumStock: z.coerce.number().min(0).optional(),
  unit: z.string().min(1).optional(),
  costPerUnit: z.coerce.number().min(0).optional(),
  entryDate: z.string().optional(),
  expiryDate: z.string().optional().nullable(),
  ingredientSkuId: z.string().min(1).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
      include: {
        ingredientSku: true,
      },
    });

    if (!ingredient) {
      return NextResponse.json(
        { error: "Bahan baku tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(ingredient);
  } catch (error) {
    console.error("GET /api/ingredients/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = ingredientUpdateSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.sku !== undefined) updateData.sku = validated.sku;
    if (validated.stock !== undefined) updateData.stock = validated.stock;
    if (validated.minimumStock !== undefined) updateData.minimumStock = validated.minimumStock;
    if (validated.unit !== undefined) updateData.unit = validated.unit;
    if (validated.costPerUnit !== undefined) updateData.costPerUnit = validated.costPerUnit;
    if (validated.entryDate !== undefined) updateData.entryDate = new Date(validated.entryDate);
    if (validated.expiryDate !== undefined) updateData.expiryDate = validated.expiryDate ? new Date(validated.expiryDate) : null;
    if (validated.ingredientSkuId !== undefined) updateData.ingredientSkuId = validated.ingredientSkuId;

    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: updateData,
      include: {
        ingredientSku: true,
      },
    });

    return NextResponse.json(ingredient);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("PUT /api/ingredients/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate bahan baku" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.ingredient.delete({ where: { id } });
    return NextResponse.json({ message: "Bahan baku berhasil dihapus" });
  } catch (error) {
    console.error("DELETE /api/ingredients/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus bahan baku" },
      { status: 500 }
    );
  }
}