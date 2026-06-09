"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, AlertTriangle } from "lucide-react";

const ingredientSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  sku: z.string().min(1, "SKU batch wajib diisi"),
  stock: z.number().min(0, "Stok tidak boleh negatif"),
  minimumStock: z.number().min(0, "Stok minimum tidak boleh negatif"),
  costPerUnit: z.number().min(0, "Harga tidak boleh negatif"),
  entryDate: z.string().min(1, "Tanggal masuk wajib diisi"),
  expiryDate: z.string().optional().nullable(),
  ingredientSkuId: z.string().min(1, "SKU bahan baku wajib dipilih"),
});

type IngredientFormData = z.infer<typeof ingredientSchema>;

interface IngredientSku {
  id: string;
  sku: string;
  name: string;
  unit: string;
}

interface Ingredient {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minimumStock: number;
  unit: string;
  costPerUnit: number;
  entryDate: string;
  expiryDate: string | null;
  ingredientSkuId: string;
  ingredientSku: IngredientSku;
  createdAt: string;
  updatedAt: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

function isExpiringSoon(expiryDate: string | null, days: number = 7): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= days;
}

function toLocalDateInput(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toISOString().split("T")[0];
}

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientSkus, setIngredientSkus] = useState<IngredientSku[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<IngredientFormData>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name: "",
      sku: "",
      stock: 0,
      minimumStock: 0,
      costPerUnit: 0,
      entryDate: new Date().toISOString().split("T")[0],
      expiryDate: "",
      ingredientSkuId: "",
    },
  });

  const selectedSkuId = watch("ingredientSkuId");

  async function fetchData() {
    try {
      const [ingredientsRes, skusRes] = await Promise.all([
        fetch("/api/ingredients"),
        fetch("/api/ingredient-skus"),
      ]);
      if (!ingredientsRes.ok || !skusRes.ok) throw new Error("Gagal fetch");
      const ingredientsData = await ingredientsRes.json();
      const skusData = await skusRes.json();
      setIngredients(ingredientsData);
      setIngredientSkus(skusData);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-fill name and unit when SKU is selected
  useEffect(() => {
    if (selectedSkuId && !editingId) {
      const sku = ingredientSkus.find((s) => s.id === selectedSkuId);
      if (sku) {
        setValue("name", sku.name);
      }
    }
  }, [selectedSkuId, ingredientSkus, editingId, setValue]);

  function openAddDialog() {
    setEditingId(null);
    reset({
      name: "",
      sku: "",
      stock: 0,
      minimumStock: 0,
      costPerUnit: 0,
      entryDate: new Date().toISOString().split("T")[0],
      expiryDate: "",
      ingredientSkuId: "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(ingredient: Ingredient) {
    setEditingId(ingredient.id);
    reset({
      name: ingredient.name,
      sku: ingredient.sku,
      stock: ingredient.stock,
      minimumStock: ingredient.minimumStock,
      costPerUnit: ingredient.costPerUnit,
      entryDate: toLocalDateInput(ingredient.entryDate),
      expiryDate: toLocalDateInput(ingredient.expiryDate),
      ingredientSkuId: ingredient.ingredientSkuId,
    });
    setDialogOpen(true);
  }

  async function onSubmit(data: IngredientFormData) {
    setSubmitting(true);
    try {
      const url = editingId
        ? `/api/ingredients/${editingId}`
        : "/api/ingredients";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan");
      }

      toast.success(
        editingId
          ? "Batch bahan baku berhasil diupdate"
          : "Batch bahan baku berhasil ditambahkan"
      );
      setDialogOpen(false);
      reset();
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus batch "${name}"?`)) return;

    try {
      const res = await fetch(`/api/ingredients/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast.success("Batch bahan baku berhasil dihapus");
      fetchData();
    } catch {
      toast.error("Gagal menghapus batch bahan baku");
    }
  }

  const filtered = ingredients.filter((i) => {
    const matchSearch =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      i.ingredientSku.sku.toLowerCase().includes(search.toLowerCase());

    if (activeTab === "all") return matchSearch;
    if (activeTab === "expired") return matchSearch && isExpired(i.expiryDate);
    if (activeTab === "expiring")
      return matchSearch && isExpiringSoon(i.expiryDate) && !isExpired(i.expiryDate);
    if (activeTab === "fresh")
      return matchSearch && !isExpired(i.expiryDate) && !isExpiringSoon(i.expiryDate);
    return matchSearch;
  });

  const expiredCount = ingredients.filter((i) => isExpired(i.expiryDate)).length;
  const expiringSoonCount = ingredients.filter(
    (i) => isExpiringSoon(i.expiryDate) && !isExpired(i.expiryDate)
  ).length;

  function getStatusBadge(ingredient: Ingredient) {
    const expired = isExpired(ingredient.expiryDate);
    const expiringSoon = isExpiringSoon(ingredient.expiryDate);

    if (expired) {
      return <Badge variant="destructive">Basi/Kedaluwarsa</Badge>;
    }
    if (ingredient.stock <= ingredient.minimumStock) {
      return <Badge variant="destructive">Stok Rendah</Badge>;
    }
    if (expiringSoon) {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600">
          Akan Kedaluwarsa
        </Badge>
      );
    }
    return <Badge variant="secondary">Aman</Badge>;
  }

  function getRowClass(ingredient: Ingredient): string {
    if (isExpired(ingredient.expiryDate)) {
      return "bg-red-50 dark:bg-red-950/20 opacity-60";
    }
    if (ingredient.stock <= ingredient.minimumStock) {
      return "bg-red-50/50 dark:bg-red-950/10";
    }
    if (isExpiringSoon(ingredient.expiryDate)) {
      return "bg-amber-50/50 dark:bg-amber-950/10";
    }
    return "";
  }

  const selectedSku = ingredientSkus.find((s) => s.id === selectedSkuId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Inventaris Bahan Baku
          </h2>
          <p className="text-muted-foreground">
            Kelola batch stok bahan baku untuk produksi
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Tambah Batch
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Batch Bahan Baku" : "Tambah Batch Bahan Baku Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>SKU Bahan Baku</Label>
                <Select
                  value={selectedSkuId}
                  onValueChange={(val) => setValue("ingredientSkuId", val ?? "")}
                  disabled={!!editingId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih SKU bahan baku" />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredientSkus.map((sku) => (
                      <SelectItem key={sku.id} value={sku.id}>
                        {sku.sku} - {sku.name} ({sku.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.ingredientSkuId && (
                  <p className="text-sm text-destructive">
                    {errors.ingredientSkuId.message}
                  </p>
                )}
                {ingredientSkus.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Belum ada SKU. Tambahkan di menu "Master SKU" terlebih dahulu.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nama Batch</Label>
                <Input
                  id="name"
                  placeholder="Contoh: Susu UHT Batch Juni"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU Batch</Label>
                  <Input
                    id="sku"
                    placeholder="SUS-UHT-20260601"
                    {...register("sku")}
                    disabled={!!editingId}
                  />
                  {errors.sku && (
                    <p className="text-sm text-destructive">
                      {errors.sku.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Satuan</Label>
                  <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                    {selectedSku?.unit || "Pilih SKU dulu"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock">Stok Saat Ini</Label>
                  <Input
                    id="stock"
                    type="number"
                    step="any"
                    {...register("stock", { valueAsNumber: true })}
                  />
                  {errors.stock && (
                    <p className="text-sm text-destructive">
                      {errors.stock.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimumStock">Stok Minimum</Label>
                  <Input
                    id="minimumStock"
                    type="number"
                    step="any"
                    {...register("minimumStock", { valueAsNumber: true })}
                  />
                  {errors.minimumStock && (
                    <p className="text-sm text-destructive">
                      {errors.minimumStock.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="costPerUnit">Harga Modal per Satuan (Rp)</Label>
                <Input
                  id="costPerUnit"
                  type="number"
                  step="any"
                  {...register("costPerUnit", { valueAsNumber: true })}
                />
                {errors.costPerUnit && (
                  <p className="text-sm text-destructive">
                    {errors.costPerUnit.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entryDate">Tanggal Masuk</Label>
                  <Input
                    id="entryDate"
                    type="date"
                    {...register("entryDate")}
                  />
                  {errors.entryDate && (
                    <p className="text-sm text-destructive">
                      {errors.entryDate.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Tanggal Kedaluwarsa</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    {...register("expiryDate")}
                  />
                  {errors.expiryDate && (
                    <p className="text-sm text-destructive">
                      {errors.expiryDate.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Kosongkan jika tidak ada batas kedaluwarsa
                  </p>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? "Menyimpan..."
                  : editingId
                  ? "Simpan Perubahan"
                  : "Tambah Batch"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerts */}
      {(expiredCount > 0 || expiringSoonCount > 0) && (
        <div className="flex gap-3">
          {expiredCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              {expiredCount} batch kedaluwarsa/basi
            </div>
          )}
          {expiringSoonCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              {expiringSoonCount} batch akan kedaluwarsa dalam 7 hari
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari bahan baku..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Semua ({ingredients.length})
          </TabsTrigger>
          <TabsTrigger value="fresh">
            Segar ({ingredients.filter((i) => !isExpired(i.expiryDate) && !isExpiringSoon(i.expiryDate)).length})
          </TabsTrigger>
          <TabsTrigger value="expiring">
            Akan Kedaluwarsa ({expiringSoonCount})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Kedaluwarsa ({expiredCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Batch</TableHead>
                  <TableHead>SKU Batch</TableHead>
                  <TableHead>SKU Induk</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Stok Min.</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead className="text-right">Harga Modal</TableHead>
                  <TableHead>Tgl Masuk</TableHead>
                  <TableHead>Tgl Kedaluwarsa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      {search
                        ? "Tidak ada bahan baku yang cocok"
                        : "Belum ada batch bahan baku. Tambahkan yang pertama!"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((ingredient) => (
                    <TableRow
                      key={ingredient.id}
                      className={getRowClass(ingredient)}
                    >
                      <TableCell className="font-medium">
                        {ingredient.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono">
                        {ingredient.sku}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {ingredient.ingredientSku.sku}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {ingredient.stock}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {ingredient.minimumStock}
                      </TableCell>
                      <TableCell>{ingredient.unit}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(ingredient.costPerUnit)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(ingredient.entryDate)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ingredient.expiryDate ? (
                          <span
                            className={
                              isExpired(ingredient.expiryDate)
                                ? "text-red-600 font-medium"
                                : isExpiringSoon(ingredient.expiryDate)
                                ? "text-amber-600 font-medium"
                                : ""
                            }
                          >
                            {formatDate(ingredient.expiryDate)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(ingredient)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(ingredient)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleDelete(ingredient.id, ingredient.name)
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}