import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ingredientSkuUpdateSchema = z.object({
  sku: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sku = await prisma.ingredientSku.findUnique({
      where: { id },
      include: { ingredients: true },
    });

    if (!sku) {
      return NextResponse.json(
        { error: "SKU bahan baku tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(sku);
  } catch (error) {
    console.error("GET /api/ingredient-skus/[id] error:", error);
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
    const validated = ingredientSkuUpdateSchema.parse(body);

    const sku = await prisma.ingredientSku.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json(sku);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("PUT /api/ingredient-skus/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate SKU bahan baku" },
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
    await prisma.ingredientSku.delete({ where: { id } });
    return NextResponse.json({ message: "SKU bahan baku berhasil dihapus" });
  } catch (error) {
    console.error("DELETE /api/ingredient-skus/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus SKU bahan baku" },
      { status: 500 }
    );
  }
}