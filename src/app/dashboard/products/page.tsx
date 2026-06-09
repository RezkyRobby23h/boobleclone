"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronsUpDown,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
interface IngredientSku {
  id: string;
  sku: string;
  name: string;
  unit: string;
  ingredients?: { id: string; stock: number; costPerUnit: number }[];
}

interface RecipeBOM {
  id: string;
  ingredientSkuId: string;
  quantity: number;
  ingredientSku: IngredientSku;
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

// --- Schema ---
const recipeSchema = z.object({
  ingredientSkuId: z.string().min(1, "Pilih bahan baku"),
  quantity: z.number().min(0.01, "Jumlah harus lebih dari 0"),
});

const productSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  sku: z.string().min(1, "SKU wajib diisi"),
  price: z.number().min(0, "Harga tidak boleh negatif"),
  category: z.string().min(1, "Kategori wajib diisi"),
  recipes: z.array(recipeSchema).min(1, "Minimal 1 bahan baku"),
});

type ProductFormData = z.infer<typeof productSchema>;

// --- Helpers ---
function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

const categoryOptions = [
  "Minuman Dingin",
  "Minuman Panas",
  "Makanan Ringan",
  "Makanan Berat",
  "Dessert",
  "Lainnya",
];

// --- Ingredient Combobox ---
function IngredientCombobox({
  ingredientSkus,
  value,
  onSelect,
  excludeIds,
}: {
  ingredientSkus: IngredientSku[];
  value: string;
  onSelect: (id: string) => void;
  excludeIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const selected = ingredientSkus.find((i) => i.id === value);
  const available = ingredientSkus.filter(
    (i) => !excludeIds.includes(i.id) || i.id === value
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="inline-flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground">
        {selected ? selected.name : "Pilih bahan baku..."}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0">
        <Command>
          <CommandInput placeholder="Cari bahan baku..." />
          <CommandList>
            <CommandEmpty>Bahan baku tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {available.map((sku) => {
                const totalStock =
                  sku.ingredients?.reduce((sum, i) => sum + i.stock, 0) ?? 0;
                const avgCost =
                  sku.ingredients && sku.ingredients.length > 0
                    ? sku.ingredients.reduce(
                        (sum, i) => sum + i.costPerUnit,
                        0
                      ) / sku.ingredients.length
                    : 0;
                return (
                  <CommandItem
                    key={sku.id}
                    value={`${sku.name} ${sku.sku}`}
                    onSelect={() => {
                      onSelect(sku.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === sku.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{sku.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sku.sku} &middot; Stok: {totalStock} {sku.unit}{" "}
                        &middot; {formatCurrency(avgCost)}/{sku.unit}
                      </p>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// --- Main Page ---
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredientSkus, setIngredientSkus] = useState<IngredientSku[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      price: 0,
      category: "",
      recipes: [{ ingredientSkuId: "", quantity: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "recipes",
  });

  const watchedRecipes = watch("recipes");

  // Calculate HPP (Harga Pokok Penjualan)
  const hpp = watchedRecipes.reduce((sum, recipe) => {
    const sku = ingredientSkus.find((s) => s.id === recipe.ingredientSkuId);
    if (!sku) return sum;
    const avgCost =
      sku.ingredients && sku.ingredients.length > 0
        ? sku.ingredients.reduce((s, i) => s + i.costPerUnit, 0) /
          sku.ingredients.length
        : 0;
    return sum + avgCost * (recipe.quantity || 0);
  }, 0);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Gagal fetch");
      const data = await res.json();
      setProducts(data);
    } catch {
      toast.error("Gagal memuat data produk");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchIngredientSkus = useCallback(async () => {
    try {
      const res = await fetch("/api/ingredient-skus");
      if (!res.ok) throw new Error("Gagal fetch");
      const data = await res.json();
      setIngredientSkus(data);
    } catch {
      toast.error("Gagal memuat data SKU bahan baku");
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchIngredientSkus();
  }, [fetchProducts, fetchIngredientSkus]);

  function openAddDialog() {
    setEditingId(null);
    reset({
      name: "",
      sku: "",
      price: 0,
      category: "",
      recipes: [{ ingredientSkuId: "", quantity: 0 }],
    });
    setDialogOpen(true);
  }

  function openEditDialog(product: Product) {
    setEditingId(product.id);
    reset({
      name: product.name,
      sku: product.sku,
      price: product.price,
      category: product.category,
      recipes:
        product.ingredients.length > 0
          ? product.ingredients.map((r) => ({
              ingredientSkuId: r.ingredientSkuId,
              quantity: r.quantity,
            }))
          : [{ ingredientSkuId: "", quantity: 0 }],
    });
    setDialogOpen(true);
  }

  async function onSubmit(data: ProductFormData) {
    setSubmitting(true);
    try {
      const url = editingId
        ? `/api/products/${editingId}`
        : "/api/products";
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
          ? "Produk berhasil diupdate"
          : "Produk berhasil ditambahkan"
      );
      setDialogOpen(false);
      reset();
      fetchProducts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus produk "${name}"?`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast.success("Produk berhasil dihapus");
      fetchProducts();
    } catch {
      toast.error("Gagal menghapus produk");
    }
  }

  const selectedSkuIds = (watchedRecipes || []).map(
    (r) => r.ingredientSkuId
  );

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Menu Produk</h2>
          <p className="text-muted-foreground">
            Kelola produk dan resep (Bill of Materials)
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Tambah Produk
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Produk" : "Tambah Produk Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Produk</Label>
                  <Input
                    id="name"
                    placeholder="Contoh: Es Kopi Susu"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    placeholder="KOP-SUS-001"
                    {...register("sku")}
                    disabled={!!editingId}
                  />
                  {errors.sku && (
                    <p className="text-sm text-destructive">
                      {errors.sku.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Harga Jual (Rp)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="any"
                    {...register("price", { valueAsNumber: true })}
                  />
                  {errors.price && (
                    <p className="text-sm text-destructive">
                      {errors.price.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <select
                    id="category"
                    {...register("category")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Pilih kategori</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-sm text-destructive">
                      {errors.category.message}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* BOM Builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">
                      Resep (Bill of Materials)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Tentukan bahan baku dan takaran per porsi
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({ ingredientSkuId: "", quantity: 0 })
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" /> Tambah Bahan
                  </Button>
                </div>

                {errors.recipes && (
                  <p className="text-sm text-destructive">
                    {errors.recipes.message}
                  </p>
                )}

                <div className="space-y-2">
                  {fields.map((field, index) => {
                    const selectedSkuId =
                      watchedRecipes?.[index]?.ingredientSkuId;
                    const selectedSku = ingredientSkus.find(
                      (s) => s.id === selectedSkuId
                    );
                    const avgCost =
                      selectedSku?.ingredients &&
                      selectedSku.ingredients.length > 0
                        ? selectedSku.ingredients.reduce(
                            (s, i) => s + i.costPerUnit,
                            0
                          ) / selectedSku.ingredients.length
                        : 0;
                    return (
                      <div
                        key={field.id}
                        className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30"
                      >
                        <div className="flex-1 space-y-2">
                          <IngredientCombobox
                            ingredientSkus={ingredientSkus}
                            value={selectedSkuId || ""}
                            onSelect={(id) =>
                              setValue(
                                `recipes.${index}.ingredientSkuId`,
                                id
                              )
                            }
                            excludeIds={selectedSkuIds.filter(
                              (_, i) => i !== index
                            )}
                          />
                          <input
                            type="hidden"
                            {...register(
                              `recipes.${index}.ingredientSkuId`
                            )}
                          />
                        </div>
                        <div className="w-32">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="any"
                              placeholder="Qty"
                              {...register(`recipes.${index}.quantity`, {
                                valueAsNumber: true,
                              })}
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {selectedSku?.unit || "unit"}
                            </span>
                          </div>
                        </div>
                        <div className="w-28 text-right">
                          {selectedSku &&
                            watchedRecipes?.[index]?.quantity > 0 && (
                              <p className="text-sm font-medium">
                                {formatCurrency(
                                  avgCost *
                                    (watchedRecipes[index].quantity || 0)
                                )}
                              </p>
                            )}
                        </div>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* HPP Calculator */}
                <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      Estimasi HPP (Harga Pokok Penjualan)
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Total biaya bahan baku per porsi
                    </p>
                  </div>
                  <p className="text-lg font-bold text-amber-800 dark:text-amber-200">
                    {formatCurrency(hpp)}
                  </p>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? "Menyimpan..."
                  : editingId
                  ? "Simpan Perubahan"
                  : "Tambah Produk"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari produk..."
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
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Harga Jual</TableHead>
              <TableHead className="text-right">HPP</TableHead>
              <TableHead>Resep</TableHead>
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
                    ? "Tidak ada produk yang cocok"
                    : "Belum ada produk. Tambahkan yang pertama!"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((product) => {
                const productHpp = product.ingredients.reduce((sum, r) => {
                  const avgCost =
                    r.ingredientSku?.ingredients &&
                    r.ingredientSku.ingredients.length > 0
                      ? r.ingredientSku.ingredients.reduce(
                          (s, i) => s + i.costPerUnit,
                          0
                        ) / r.ingredientSku.ingredients.length
                      : 0;
                  return sum + avgCost * r.quantity;
                }, 0);
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.sku}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(product.price)}
                    </TableCell>
                    <TableCell className="text-right text-amber-600">
                      {formatCurrency(productHpp)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {product.ingredients.map((r) => (
                          <Badge key={r.id} variant="secondary">
                            {r.ingredientSku.name} ({r.quantity}
                            {r.ingredientSku.unit})
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.isActive ? (
                        <Badge variant="secondary">Aktif</Badge>
                      ) : (
                        <Badge variant="outline">Nonaktif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleDelete(product.id, product.name)
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