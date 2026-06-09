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
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

const ingredientSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  sku: z.string().min(1, "SKU wajib diisi"),
  stock: z.number().min(0, "Stok tidak boleh negatif"),
  minimumStock: z.number().min(0, "Stok minimum tidak boleh negatif"),
  unit: z.string().min(1, "Satuan wajib diisi"),
  costPerUnit: z.number().min(0, "Harga tidak boleh negatif"),
});

type IngredientFormData = z.infer<typeof ingredientSchema>;

interface Ingredient {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minimumStock: number;
  unit: string;
  costPerUnit: number;
  createdAt: string;
  updatedAt: string;
}

const unitOptions = [
  { value: "g", label: "Gram (g)" },
  { value: "kg", label: "Kilogram (kg)" },
  { value: "ml", label: "Mililiter (ml)" },
  { value: "liter", label: "Liter" },
  { value: "pcs", label: "Pieces (pcs)" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      unit: "",
      costPerUnit: 0,
    },
  });

  const selectedUnit = watch("unit");

  async function fetchIngredients() {
    try {
      const res = await fetch("/api/ingredients");
      if (!res.ok) throw new Error("Gagal fetch");
      const data = await res.json();
      setIngredients(data);
    } catch {
      toast.error("Gagal memuat data bahan baku");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchIngredients();
  }, []);

  function openAddDialog() {
    setEditingId(null);
    reset({ name: "", sku: "", stock: 0, minimumStock: 0, unit: "", costPerUnit: 0 });
    setDialogOpen(true);
  }

  function openEditDialog(ingredient: Ingredient) {
    setEditingId(ingredient.id);
    reset({
      name: ingredient.name,
      sku: ingredient.sku,
      stock: ingredient.stock,
      minimumStock: ingredient.minimumStock,
      unit: ingredient.unit,
      costPerUnit: ingredient.costPerUnit,
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
          ? "Bahan baku berhasil diupdate"
          : "Bahan baku berhasil ditambahkan"
      );
      setDialogOpen(false);
      reset();
      fetchIngredients();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus bahan baku "${name}"?`)) return;

    try {
      const res = await fetch(`/api/ingredients/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast.success("Bahan baku berhasil dihapus");
      fetchIngredients();
    } catch {
      toast.error("Gagal menghapus bahan baku");
    }
  }

  const filtered = ingredients.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Inventaris Bahan Baku
          </h2>
          <p className="text-muted-foreground">
            Kelola stok bahan baku untuk produksi
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Tambah Bahan
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Bahan Baku" : "Tambah Bahan Baku Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Bahan</Label>
                <Input
                  id="name"
                  placeholder="Contoh: Susu UHT Full Cream"
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
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    placeholder="SUS-UHT-001"
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
                  <Select
                    value={selectedUnit}
                    onValueChange={(val) => setValue("unit", val ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih satuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.unit && (
                    <p className="text-sm text-destructive">
                      {errors.unit.message}
                    </p>
                  )}
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

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? "Menyimpan..."
                  : editingId
                  ? "Simpan Perubahan"
                  : "Tambah Bahan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Stok</TableHead>
              <TableHead className="text-right">Stok Min.</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Harga Modal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  {search
                    ? "Tidak ada bahan baku yang cocok"
                    : "Belum ada bahan baku. Tambahkan yang pertama!"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((ingredient) => {
                const isLow = ingredient.stock <= ingredient.minimumStock;
                return (
                  <TableRow
                    key={ingredient.id}
                    className={
                      isLow
                        ? "bg-red-50 dark:bg-red-950/20"
                        : undefined
                    }
                  >
                    <TableCell className="font-medium">
                      {ingredient.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ingredient.sku}
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
                    <TableCell>
                      {isLow ? (
                        <Badge variant="destructive">Restock Needed</Badge>
                      ) : (
                        <Badge variant="secondary">Aman</Badge>
                      )}
                    </TableCell>
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}