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

    // Fetch all products with their BOM
    const productIds = validated.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        ingredients: {
          include: {
            ingredientSku: true,
          },
        },
      },
    });

    const productMap = new Map(products.map((p: any) => [p.id, p]));

    // Validate stock with FEFO: check across all non-expired batches of same SKU
    // First, collect all ingredient SKU IDs needed
    const ingredientSkuIds = new Set<string>();
    for (const item of validated.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Produk dengan ID ${item.productId} tidak ditemukan` },
          { status: 400 }
        );
      }
      for (const recipe of (product as any).ingredients) {
        ingredientSkuIds.add(recipe.ingredientSkuId);
      }
    }

    // Fetch all non-expired batches for each ingredient SKU, ordered by expiry (FEFO)
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

    // Group batches by ingredientSkuId
    const batchesBySku = new Map<string, typeof allBatches>();
    for (const batch of allBatches) {
      const existing = batchesBySku.get(batch.ingredientSkuId) || [];
      existing.push(batch);
      batchesBySku.set(batch.ingredientSkuId, existing);
    }

    // Calculate total amount and validate stock availability
    let totalAmount = 0;
    for (const item of validated.items) {
      const product = productMap.get(item.productId);
      totalAmount += (product as any).price * item.quantity;

      for (const recipe of (product as any).ingredients) {
        const requiredQty = recipe.quantity * item.quantity;
        const skuBatches = batchesBySku.get(recipe.ingredientSkuId) || [];
        const totalAvailable = skuBatches.reduce((sum, b) => sum + b.stock, 0);

        if (totalAvailable < requiredQty) {
          return NextResponse.json(
            {
              error: `Stok ${recipe.ingredientSku.name} tidak cukup. Dibutuhkan: ${requiredQty} ${recipe.ingredientSku.unit}, Tersedia: ${totalAvailable} ${recipe.ingredientSku.unit} (batch aktif)`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Execute transaction with FEFO deduction
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

      // FEFO Auto-Deduction: deduct from batches closest to expiry first
      // Clone the batches map for deduction tracking
      const deductionMap = new Map<string, number>();
      for (const item of validated.items) {
        const prod = productMap.get(item.productId)!;
      for (const recipe of (prod as any).ingredients) {
          const skuId = recipe.ingredientSkuId;
          const deductionQty = recipe.quantity * item.quantity;
          deductionMap.set(skuId, (deductionMap.get(skuId) || 0) + deductionQty);
        }
      }

      // Deduct stock using FEFO order
      for (const [skuId, totalDeduction] of deductionMap) {
        let remaining = totalDeduction;
        const skuBatches = batchesBySku.get(skuId) || [];

        for (const batch of skuBatches) {
          if (remaining <= 0) break;
          const deduct = Math.min(remaining, batch.stock);
          if (deduct > 0) {
            await tx.ingredient.update({
              where: { id: batch.id },
              data: { stock: { decrement: deduct } },
            });
            remaining -= deduct;
          }
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