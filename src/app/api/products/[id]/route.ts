import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const recipeSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.number().min(0.01),
});

const productUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  category: z.string().min(1).optional(),
  imageUrl: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  recipes: z.array(recipeSchema).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        ingredients: { include: { ingredient: true } },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("GET /api/products/[id] error:", error);
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
    const validated = productUpdateSchema.parse(body);

    // If recipes are provided, replace all existing recipes
    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.price !== undefined) updateData.price = validated.price;
    if (validated.category !== undefined) updateData.category = validated.category;
    if (validated.imageUrl !== undefined) updateData.imageUrl = validated.imageUrl;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

    if (validated.recipes) {
      // Delete existing recipes and recreate
      await prisma.recipeBOM.deleteMany({ where: { productId: id } });
      updateData.ingredients = {
        create: validated.recipes.map((r) => ({
          ingredientId: r.ingredientId,
          quantity: r.quantity,
        })),
      };
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        ingredients: { include: { ingredient: true } },
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("PUT /api/products/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate produk" },
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
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ message: "Produk berhasil dihapus" });
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus produk" },
      { status: 500 }
    );
  }
}