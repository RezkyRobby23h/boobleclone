import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const recipeSchema = z.object({
  ingredientSkuId: z.string().min(1),
  quantity: z.number().min(0.01),
});

const productSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  sku: z.string().min(1, "SKU wajib diisi"),
  price: z.number().min(0, "Harga tidak boleh negatif"),
  category: z.string().min(1, "Kategori wajib diisi"),
  imageUrl: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  recipes: z.array(recipeSchema).min(1, "Minimal 1 bahan baku"),
});

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        ingredients: {
          include: { ingredientSku: true },
        },
      },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data produk" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = productSchema.parse(body);

    const existing = await prisma.product.findUnique({
      where: { sku: validated.sku },
    });

    if (existing) {
      return NextResponse.json(
        { error: `SKU "${validated.sku}" sudah digunakan` },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name: validated.name,
        sku: validated.sku,
        price: validated.price,
        category: validated.category,
        imageUrl: validated.imageUrl ?? null,
        isActive: validated.isActive,
        ingredients: {
          create: validated.recipes.map((r) => ({
            ingredientSkuId: r.ingredientSkuId,
            quantity: r.quantity,
          })),
        },
      },
      include: {
        ingredients: { include: { ingredientSku: true } },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("POST /api/products error:", error);
    return NextResponse.json(
      { error: "Gagal membuat produk" },
      { status: 500 }
    );
  }
}