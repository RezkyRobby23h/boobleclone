import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Daily revenue for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        status: "COMPLETED",
        createdAt: { gte: sevenDaysAgo },
      },
      include: {
        orderItems: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by date
    const revenueByDate: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      revenueByDate[key] = 0;
    }

    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      if (revenueByDate[key] !== undefined) {
        revenueByDate[key] += order.totalAmount;
      }
    }

    const dailyRevenue = Object.entries(revenueByDate).map(([date, revenue]) => ({
      date,
      label: new Date(date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
      }),
      revenue,
    }));

    // Top 5 products by quantity sold
    const allOrderItems = orders.flatMap((o: any) => o.orderItems);
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};

    for (const item of allOrderItems) {
      const key = item.productId;
      if (!productSales[key]) {
        productSales[key] = { name: item.product.name, quantity: 0, revenue: 0 };
      }
      productSales[key].quantity += item.quantity;
      productSales[key].revenue += item.price * item.quantity;
    }

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return NextResponse.json({ dailyRevenue, topProducts });
  } catch (error) {
    console.error("GET /api/analytics error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data analytics" },
      { status: 500 }
    );
  }
}