"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useCartStore } from "@/hooks/useCartStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  CreditCard,
  Banknote,
  QrCode,
  Package,
} from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  sku: string;
  stock: number;
  unit: string;
  costPerUnit: number;
}

interface RecipeBOM {
  id: string;
  ingredientId: string;
  quantity: number;
  ingredient: Ingredient;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  category: string;
  imageUrl: string | null;
  isActive: boolean;
  ingredients: RecipeBOM[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

const paymentOptions = [
  { value: "CASH", label: "Tunai", icon: Banknote },
  { value: "QRIS", label: "QRIS", icon: QrCode },
  { value: "DEBIT", label: "Kartu Debit", icon: CreditCard },
];

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [processing, setProcessing] = useState(false);

  const cart = useCartStore();

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Gagal fetch");
      const data = await res.json();
      setProducts(data.filter((p: Product) => p.isActive));
    } catch {
      toast.error("Gagal memuat data produk");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Calculate max quantity based on stock
  function getMaxQuantity(product: Product): number {
    if (product.ingredients.length === 0) return 99;
    let max = Infinity;
    for (const recipe of product.ingredients) {
      const possible = Math.floor(recipe.ingredient.stock / recipe.quantity);
      if (possible < max) max = possible;
    }
    return Math.max(0, max);
  }

  function handleAddToCart(product: Product) {
    const maxQty = getMaxQuantity(product);
    if (maxQty <= 0) {
      toast.error(`Stok bahan baku tidak cukup untuk ${product.name}`);
      return;
    }

    const existingItem = cart.items.find((i) => i.productId === product.id);
    if (existingItem && existingItem.quantity >= maxQty) {
      toast.error(`Stok hanya tersisa untuk ${maxQty} porsi`);
      return;
    }

    cart.addItem({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      maxQuantity: maxQty,
    });
    toast.success(`${product.name} ditambahkan ke keranjang`);
  }

  async function handleCheckout() {
    if (cart.items.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentType: cart.paymentType,
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memproses transaksi");
      }

      const result = await res.json();
      toast.success(`Transaksi berhasil! Invoice: ${result.invoiceNo}`);
      cart.clearCart();
      fetchProducts(); // Refresh to update stock
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal checkout");
    } finally {
      setProcessing(false);
    }
  }

  // Get unique categories
  const categories = ["all", ...new Set(products.map((p) => p.category))];

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="flex gap-6 h-[calc(100vh-7rem)]">
      {/* Left: Product Catalog */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kasir (POS)</h2>
          <p className="text-muted-foreground">
            Pilih produk untuk ditambahkan ke keranjang
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {categories
                .filter((c) => c !== "all")
                .map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Memuat produk...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Tidak ada produk ditemukan</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((product) => {
              const maxQty = getMaxQuantity(product);
              const inCart = cart.items.find(
                (i) => i.productId === product.id
              );
              return (
                <button
                  key={product.id}
                  onClick={() => handleAddToCart(product)}
                  disabled={maxQty <= 0}
                  className="group relative flex flex-col p-4 rounded-xl border bg-card text-left transition-all hover:shadow-md hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inCart && (
                    <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                      {inCart.quantity}
                    </Badge>
                  )}
                  <Badge variant="outline" className="w-fit mb-2 text-xs">
                    {product.category}
                  </Badge>
                  <h3 className="font-semibold text-sm leading-tight">
                    {product.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {product.sku}
                  </p>
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <p className="font-bold text-primary">
                      {formatCurrency(product.price)}
                    </p>
                    <span
                      className={`text-xs ${
                        maxQty <= 0
                          ? "text-destructive"
                          : maxQty <= 5
                          ? "text-amber-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      Stok: {maxQty}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Cart Panel */}
      <div className="w-[380px] flex flex-col border rounded-xl bg-card overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 border-b flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <h3 className="font-semibold">Keranjang</h3>
          <Badge variant="secondary" className="ml-auto">
            {cart.items.reduce((sum, i) => sum + i.quantity, 0)} item
          </Badge>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Keranjang kosong</p>
              <p className="text-xs">Klik produk untuk menambahkan</p>
            </div>
          ) : (
            cart.items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-3 p-3 rounded-lg border bg-background"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.price)} x {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => cart.decrementQuantity(item.productId)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-mono">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => cart.incrementQuantity(item.productId)}
                    disabled={item.quantity >= item.maxQuantity}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <p className="font-semibold text-sm w-20 text-right">
                  {formatCurrency(item.price * item.quantity)}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => cart.removeItem(item.productId)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer */}
        <div className="border-t p-4 space-y-3">
          {/* Payment Type */}
          <div className="flex gap-2">
            {paymentOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => cart.setPaymentType(opt.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  cart.paymentType === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted"
                }`}
              >
                <opt.icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            ))}
          </div>

          <Separator />

          {/* Total */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total</p>
            <p className="text-xl font-bold">
              {formatCurrency(cart.totalAmount())}
            </p>
          </div>

          {/* Checkout Button */}
          <Button
            className="w-full h-12 text-base font-semibold"
            disabled={cart.items.length === 0 || processing}
            onClick={handleCheckout}
          >
            {processing ? "Memproses..." : "Bayar Sekarang"}
          </Button>

          {cart.items.length > 0 && (
            <Button
              variant="ghost"
              className="w-full text-destructive"
              size="sm"
              onClick={() => cart.clearCart()}
            >
              Kosongkan Keranjang
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}