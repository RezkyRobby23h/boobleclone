import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ingredientSkuSchema = z.object({
  sku: z.string().min(1, "SKU wajib diisi"),
  name: z.string().min(1, "Nama wajib diisi"),
  unit: z.string().min(1, "Satuan wajib diisi"),
});

export async function GET() {
  try {
    const skus = await prisma.ingredientSku.findMany({
      orderBy: { name: "asc" },
      include: {
        ingredients: true,
      },
    });
    return NextResponse.json(skus);
  } catch (error) {
    console.error("GET /api/ingredient-skus error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data SKU bahan baku" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ingredientSkuSchema.parse(body);

    const existing = await prisma.ingredientSku.findUnique({
      where: { sku: validated.sku },
    });

    if (existing) {
      return NextResponse.json(
        { error: `SKU "${validated.sku}" sudah digunakan` },
        { status: 400 }
      );
    }

    const sku = await prisma.ingredientSku.create({
      data: validated,
    });

    return NextResponse.json(sku, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("POST /api/ingredient-skus error:", error);
    return NextResponse.json(
      { error: "Gagal membuat SKU bahan baku" },
      { status: 500 }
    );
  }
}