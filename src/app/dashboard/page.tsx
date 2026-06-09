import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package, DollarSign, ShoppingCart, AlertTriangle } from "lucide-react";
import { DashboardCharts } from "@/components/dashboard-charts";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

export default async function DashboardPage() {
  const [ingredients, products, orders, lowStockItems] = await Promise.all([
    prisma.ingredient.findMany(),
    prisma.product.findMany(),
    prisma.order.findMany({ where: { status: "COMPLETED" } }),
    prisma.ingredient.findMany({
      where: {
        stock: { lte: prisma.ingredient.fields.minimumStock },
      },
    }),
  ]);

  const lowStockCount = lowStockItems.length;
  const totalRevenue = orders.reduce((sum: number, o: { totalAmount: number }) => sum + o.totalAmount, 0);
  const totalTransactions = orders.length;
  const warehouseValue = ingredients.reduce(
    (sum: number, i: { stock: number; costPerUnit: number }) => sum + i.stock * i.costPerUnit,
    0
  );

  const stats = [
    {
      title: "Total Pendapatan",
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      description: `${totalTransactions} transaksi selesai`,
    },
    {
      title: "Total Transaksi",
      value: totalTransactions.toString(),
      icon: ShoppingCart,
      description: "Pesanan completed",
    },
    {
      title: "Nilai Aset Gudang",
      value: formatCurrency(warehouseValue),
      icon: Package,
      description: `${ingredients.length} jenis bahan baku`,
    },
    {
      title: "Restock Needed",
      value: lowStockCount.toString(),
      icon: AlertTriangle,
      description: "Bahan baku di bawah minimum",
      destructive: lowStockCount > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Ringkasan data bisnis inventaris & penjualan
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon
                className={`h-4 w-4 ${
                  stat.destructive
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  stat.destructive ? "text-destructive" : ""
                }`}
              >
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Produk Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{products.length}</p>
            <p className="text-sm text-muted-foreground">
              menu produk tersedia
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bahan Baku</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{ingredients.length}</p>
            <p className="text-sm text-muted-foreground">
              jenis bahan baku terdaftar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <DashboardCharts />
    </div>
  );
}
