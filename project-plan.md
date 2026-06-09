# 📋 Project Blueprint: Next.js Inventory & POS System (Booble-inspired)

Dokumen ini berisi rencana arsitektur, spesifikasi fitur, dan teknologi untuk membangun web aplikasi manajemen inventaris bahan baku dan Point of Sales (POS) yang responsif, modern, dan presisi.

## 1. Tech Stack & Libraries Rekomendasi
Untuk menghasilkan performa optimal dan tampilan UI/UX yang premium, berikut adalah kombinasi library yang digunakan:
- **Framework:** Next.js 14+ (App Router) dengan TypeScript.
- **Styling & UI:** Tailwind CSS + Shadcn UI (untuk komponen modern seperti Dialog, Popover, Command, dan Toast) + Lucide React (Icons).
- **State Management & Data Fetching:** TanStack Query (React Query) + Zustand (untuk global state kasir/keranjang belanja).
- **Database & ORM:** PostgreSQL + Prisma ORM (atau Supabase untuk kemudahan backend-as-a-service).
- **Charts & Analytics:** Recharts (untuk grafik penjualan, produk terlaris, dan tren stok).
- **Form Handling:** React Hook Form + Zod (validasi skema data produk dan bahan baku).

---

## 2. Arsitektur Basis Data (Prisma Schema Reference)
Sistem ini bertumpu pada relasi erat antara Produk, SKU Bahan Baku (`IngredientSku`), Batch Bahan Baku (`Ingredient`), dan Resep (`RecipeBOM`). Konsep batch memungkinkan pelacakan tanggal masuk dan kedaluwarsa, serta penerapan sistem FEFO (First Expiry, First Out) pada saat checkout.

```prisma
model IngredientSku {
  id          String       @id @default(cuid())
  sku         String       @unique // Contoh: SUS-UHT
  name        String       // Contoh: Susu UHT Full Cream
  unit        String       // g, ml, pcs, kg
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  ingredients Ingredient[]
  recipes     RecipeBOM[]
}

model Ingredient {
  id              String        @id @default(cuid())
  name            String        // Nama batch, contoh: Susu UHT Batch Juni
  sku             String        @unique // SKU batch, contoh: SUS-UHT-20260601
  stock           Float         // Stok saat ini (gram, ml, pcs, dll)
  minimumStock    Float         // Batas peringatan stok menipis
  unit            String        // g, ml, pcs, kg
  costPerUnit     Float         // Harga modal per unit bahan baku
  entryDate       DateTime      @default(now()) // Tanggal masuk bahan baku
  expiryDate      DateTime?     // Tanggal kedaluwarsa (basi), null = tidak ada batas
  ingredientSkuId String        // Relasi ke master SKU
  ingredientSku   IngredientSku @relation(fields: [ingredientSkuId], references: [id], onDelete: Cascade)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([ingredientSkuId])
}

model Product {
  id          String   @id @default(cuid())
  name        String
  sku         String   @unique
  price       Float    // Harga jual ke konsumen
  category    String
  imageUrl    String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  ingredients RecipeBOM[]
  orderItems  OrderItem[]
}

model RecipeBOM {
  id              String        @id @default(cuid())
  productId       String
  ingredientSkuId String        // Resep terikat ke SKU bahan baku, bukan batch
  quantity        Float         // Jumlah bahan mentah yang dibutuhkan per 1 porsi produk
  product         Product       @relation(fields: [productId], references: [id], onDelete: Cascade)
  ingredientSku   IngredientSku @relation(fields: [ingredientSkuId], references: [id], onDelete: Cascade)

  @@unique([productId, ingredientSkuId])
}

model Order {
  id          String      @id @default(cuid())
  invoiceNo   String      @unique // Contoh: INV-20260608-0001
  totalAmount Float
  paymentType String      // CASH, QRIS, DEBIT (Sistem integrasi payment gateway menyusul)
  status      String      // COMPLETED, PENDING, CANCELLED
  createdAt   DateTime    @default(now())
  orderItems  OrderItem[]
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  productId String
  quantity  Int
  price     Float   // Harga saat transaksi terjadi
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id])
}
