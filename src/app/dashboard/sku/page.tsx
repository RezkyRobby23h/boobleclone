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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

const skuSchema = z.object({
  sku: z.string().min(1, "SKU wajib diisi"),
  name: z.string().min(1, "Nama wajib diisi"),
  unit: z.string().min(1, "Satuan wajib diisi"),
});

type SkuFormData = z.infer<typeof skuSchema>;

interface IngredientSku {
  id: string;
  sku: string;
  name: string;
  unit: string;
  createdAt: string;
  updatedAt: string;
  ingredients?: { id: string }[];
}

const unitOptions = [
  { value: "g", label: "Gram (g)" },
  { value: "kg", label: "Kilogram (kg)" },
  { value: "ml", label: "Mililiter (ml)" },
  { value: "liter", label: "Liter" },
  { value: "pcs", label: "Pieces (pcs)" },
];

export default function SkuPage() {
  const [skus, setSkus] = useState<IngredientSku[]>([]);
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
  } = useForm<SkuFormData>({
    resolver: zodResolver(skuSchema),
    defaultValues: {
      sku: "",
      name: "",
      unit: "",
    },
  });

  const selectedUnit = watch("unit");

  async function fetchSkus() {
    try {
      const res = await fetch("/api/ingredient-skus");
      if (!res.ok) throw new Error("Gagal fetch");
      const data = await res.json();
      setSkus(data);
    } catch {
      toast.error("Gagal memuat data SKU bahan baku");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSkus();
  }, []);

  function openAddDialog() {
    setEditingId(null);
    reset({ sku: "", name: "", unit: "" });
    setDialogOpen(true);
  }

  function openEditDialog(sku: IngredientSku) {
    setEditingId(sku.id);
    reset({
      sku: sku.sku,
      name: sku.name,
      unit: sku.unit,
    });
    setDialogOpen(true);
  }

  async function onSubmit(data: SkuFormData) {
    setSubmitting(true);
    try {
      const url = editingId
        ? `/api/ingredient-skus/${editingId}`
        : "/api/ingredient-skus";
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
          ? "SKU bahan baku berhasil diupdate"
          : "SKU bahan baku berhasil ditambahkan"
      );
      setDialogOpen(false);
      reset();
      fetchSkus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus SKU "${name}"? Semua batch bahan baku terkait juga akan dihapus.`)) return;

    try {
      const res = await fetch(`/api/ingredient-skus/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast.success("SKU bahan baku berhasil dihapus");
      fetchSkus();
    } catch {
      toast.error("Gagal menghapus SKU bahan baku");
    }
  }

  const filtered = skus.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Master SKU Bahan Baku
          </h2>
          <p className="text-muted-foreground">
            Kelola daftar SKU bahan baku yang tersedia
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Tambah SKU
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit SKU Bahan Baku" : "Tambah SKU Bahan Baku Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  placeholder="Contoh: SUS-UHT"
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

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? "Menyimpan..."
                  : editingId
                  ? "Simpan Perubahan"
                  : "Tambah SKU"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari SKU bahan baku..."
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
              <TableHead>SKU</TableHead>
              <TableHead>Nama Bahan</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Jumlah Batch</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {search
                    ? "Tidak ada SKU yang cocok"
                    : "Belum ada SKU bahan baku. Tambahkan yang pertama!"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((sku) => (
                <TableRow key={sku.id}>
                  <TableCell className="font-mono font-medium">
                    {sku.sku}
                  </TableCell>
                  <TableCell>{sku.name}</TableCell>
                  <TableCell>{sku.unit}</TableCell>
                  <TableCell className="text-right font-mono">
                    {sku.ingredients?.length ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(sku)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(sku.id, sku.name)}
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
    </div>
  );
}