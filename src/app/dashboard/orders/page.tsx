"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Search, CreditCard, Banknote, QrCode } from "lucide-react";

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    sku: string;
  };
}

interface Order {
  id: string;
  invoiceNo: string;
  totalAmount: number;
  paymentType: string;
  status: string;
  createdAt: string;
  orderItems: OrderItem[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const paymentBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  CASH: "default",
  QRIS: "secondary",
  DEBIT: "outline",
};

const paymentLabels: Record<string, string> = {
  CASH: "Tunai",
  QRIS: "QRIS",
  DEBIT: "Kartu Debit",
};

const paymentIcons: Record<string, typeof Banknote> = {
  CASH: Banknote,
  QRIS: QrCode,
  DEBIT: CreditCard,
};

const statusBadgeVariant: Record<string, "default" | "secondary" | "destructive"> = {
  COMPLETED: "default",
  PENDING: "secondary",
  CANCELLED: "destructive",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Gagal fetch");
      const data = await res.json();
      setOrders(data);
    } catch {
      toast.error("Gagal memuat data pesanan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = orders.filter(
    (o) =>
      o.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      o.orderItems.some((item) =>
        item.product.name.toLowerCase().includes(search.toLowerCase())
      )
  );

  const PaymentIcon = selectedOrder ? paymentIcons[selectedOrder.paymentType] || Banknote : Banknote;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Riwayat Pesanan</h2>
        <p className="text-muted-foreground">
          Klik baris pesanan untuk melihat detail perincian
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari invoice atau produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Jumlah Item</TableHead>
              <TableHead>Metode Bayar</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {search
                    ? "Tidak ada pesanan yang cocok"
                    : "Belum ada pesanan."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedOrder(order)}
                >
                  <TableCell className="font-mono font-medium">
                    {order.invoiceNo}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    {order.orderItems.reduce((sum, i) => sum + i.quantity, 0)} item
                  </TableCell>
                  <TableCell>
                    <Badge variant={paymentBadgeVariant[order.paymentType] || "outline"}>
                      {paymentLabels[order.paymentType] || order.paymentType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant[order.status] || "secondary"}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(order.totalAmount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-w-lg">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Detail Pesanan
                  <Badge variant="outline" className="font-mono">
                    {selectedOrder.invoiceNo}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Tanggal</p>
                    <p className="text-sm font-medium">
                      {formatDate(selectedOrder.createdAt)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={statusBadgeVariant[selectedOrder.status] || "secondary"}>
                      {selectedOrder.status}
                    </Badge>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <PaymentIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Metode Pembayaran</p>
                    <p className="text-sm font-semibold">
                      {paymentLabels[selectedOrder.paymentType] || selectedOrder.paymentType}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Order Items */}
                <div>
                  <p className="text-sm font-semibold mb-3">Item Pesanan</p>
                  <div className="space-y-2">
                    {selectedOrder.orderItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-background"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.product.sku} &middot; {formatCurrency(item.price)} x {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-semibold">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Total */}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Pembayaran
                  </p>
                  <p className="text-xl font-bold">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}