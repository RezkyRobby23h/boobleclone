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
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
      include: { recipes: { include: { product: true } } },
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

    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: validated,
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