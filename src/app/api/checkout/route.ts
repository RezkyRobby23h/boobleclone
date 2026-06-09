import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1),
      })
    )
    .min(1, "Minimal 1 item"),
  paymentType: z.enum(["CASH", "QRIS", "DEBIT"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = checkoutSchema.parse(body);

    // Generate invoice number: INV-YYYYMMDD-XXXX
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

    // Fetch all products with their BOM first
    const productIds = validated.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        ingredients: {
          include: { ingredient: true },
        },
      },
    });

    const productMap = new Map(products.map((p: any) => [p.id, p]));

    // Validate stock and calculate total
    let totalAmount = 0;
    for (const item of validated.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Produk dengan ID ${item.productId} tidak ditemukan` },
          { status: 400 }
        );
      }

      totalAmount += (product as any).price * item.quantity;

      for (const recipe of (product as any).ingredients) {
        const requiredQty = recipe.quantity * item.quantity;
        if (recipe.ingredient.stock < requiredQty) {
          return NextResponse.json(
            {
              error: `Stok ${recipe.ingredient.name} tidak cukup. Dibutuhkan: ${requiredQty} ${recipe.ingredient.unit}, Tersedia: ${recipe.ingredient.stock} ${recipe.ingredient.unit}`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Execute transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (prisma as any).$transaction(async (tx: any) => {
      // Count today's orders for sequential number
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const todayOrderCount = await tx.order.count({
        where: {
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      });

      const sequence = String(todayOrderCount + 1).padStart(4, "0");
      const invoiceNo = `INV-${dateStr}-${sequence}`;

      // Create Order with OrderItems
      const orderItemsData = validated.items.map((item) => {
        const prod = productMap.get(item.productId)!;
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: (prod as any).price,
        };
      });

      const order = await tx.order.create({
        data: {
          invoiceNo,
          totalAmount,
          paymentType: validated.paymentType,
          status: "COMPLETED",
          orderItems: {
            create: orderItemsData,
          },
        },
        include: { orderItems: true },
      });

      // Auto-Deduction: decrement stock for each ingredient
      for (const item of validated.items) {
        const prod = productMap.get(item.productId)!;
        for (const recipe of (prod as any).ingredients) {
          const deductionQty = recipe.quantity * item.quantity;
          await tx.ingredient.update({
            where: { id: recipe.ingredientId },
            data: {
              stock: { decrement: deductionQty },
            },
          });
        }
      }

      return order;
    });

    return NextResponse.json(
      {
        message: "Transaksi berhasil",
        invoiceNo: result.invoiceNo,
        orderId: result.id,
        totalAmount: result.totalAmount,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validasi gagal", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/checkout error:", error);
    return NextResponse.json(
      { error: "Gagal memproses transaksi" },
      { status: 500 }
    );
  }
}