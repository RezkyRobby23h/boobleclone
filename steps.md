## STEP-BY-STEP IMPLEMENTATION PROMPTS

### Langkah 1: Inisialisasi Database & Skema Prisma
> **Prompt untuk Agen:**
> "Inisialisasi skema database Prisma untuk aplikasi POS-Inventory. Buat model berikut: `Ingredient` (id, name, sku, stock, minimumStock, unit, costPerUnit), `Product` (id, name, sku, price, category, isActive), `RecipeBOM` (id, productId, ingredientId, quantity) dengan unique constraint gabungan productId dan ingredientId, `Order` (id, invoiceNo, totalAmount, paymentType, status, createdAt), dan `OrderItem` (id, orderId, productId, quantity, price). Konfigurasikan relasi dengan cascading delete yang aman pada RecipeBOM jika Product atau Ingredient dihapus."

### Langkah 2: Membangun API & Halaman CRUD Bahan Baku (Inventory)
> **Prompt untuk Agen:**
> "Buat halaman dashboard inventaris bahan baku di `/dashboard/inventory`. Implementasikan tabel menggunakan Shadcn UI Table dengan fitur pencarian dan filter. Buat API Route `GET /api/ingredients` dan `POST /api/ingredients` menggunakan Next.js App Router handler. Tambahkan dialog form menggunakan React Hook Form dan Zod untuk validasi input bahan baku baru termasuk validasi batas stok minimum. Jika stok saat ini di bawah batas minimum, baris tabel harus memiliki highlight peringatan (warna teks/latar belakang soft amber/red)."

### Langkah 3: Membangun Modul Menu & Manajemen Resep (BOM Builder) dengan Autocomplete Tagging
> **Prompt untuk Agen:**
> "Buat halaman manajemen menu produk di `/dashboard/products`. Di dalam form tambah produk baru, buat antarmuka dinamis (BOM Builder) menggunakan `useFieldArray` dari React Hook Form. 
> 
> KELOLA BAHAN BAKU MENGGUNAKAN COMBOBOX/TAGGING: 
> Jangan gunakan text input biasa untuk memilih bahan baku. Gunakan komponen `Combobox` (gabungan `Popover` dan `Command` dari Shadcn UI). Ambil data (fetch) dari `GET /api/ingredients` agar pengguna bisa mencari (search/autocomplete) dan memilih (tag) bahan baku yang sudah ada di database. 
> 
> Setelah bahan baku di-tag, berikan input number di sebelahnya untuk menentukan takaran (quantity) per porsi. Buat kalkulator real-time di client-side yang menjumlahkan `costPerUnit` dari bahan baku untuk menampilkan perkiraan Harga Pokok Penjualan (HPP) menu tersebut sebelum disimpan ke database melalui `POST /api/products`."

### Langkah 4: Membangun Interface Kasir / POS & Zustand Store
> **Prompt untuk Agen:**
> "Buat halaman kasir di `/dashboard/pos`. Buat Zustand store (`src/hooks/useCartStore.ts`) untuk mengelola item di keranjang belanja. Halaman kasir dibagi menjadi bagian utama: Katalog Produk berbentuk grid card yang dapat difilter per kategori, dan panel kanan berupa ringkasan keranjang belanja. Ketika item diklik, tambahkan ke dalam Zustand store. Pastikan ada fungsi check di client-side untuk memvalidasi apakah stok bahan baku mencukupi sebelum mengizinkan penambahan kuantitas produk ke keranjang."

### Langkah 5: Transaksi Checkout & Algoritma Auto-Deduction Stok (Kritis)
> **Prompt untuk Agen:**
> "Buat API Route `POST /api/checkout` yang menerima payload data keranjang belanja dan tipe pembayaran. Di dalam backend handler, gunakan `prisma.$transaction` untuk mengeksekusi operasi atomik berikut:
> 1. Generate nomor invoice unik otomatis (Format: INV-YYYYMMDD-[Counter]).
> 2. Buat rekor baru di tabel `Order` dan `OrderItem`.
> 3. Lakukan looping untuk setiap item pesanan, ambil data `RecipeBOM` produk tersebut, lalu lakukan update decrement (`increment: -calculatedQuantity`) pada kolom `stock` di tabel `Ingredient`.
> Jika terjadi kehabisan stok bahan baku di tengah proses looping, batalkan transaksi (throw error) dan kirim response status 400 dengan pesan error bahan baku spesifik mana yang kurang."

### Langkah 6: Dashboard Analitik & Chart Visualisasi
> **Prompt untuk Agen:**
> "Buat halaman utama `/dashboard` yang mengagregasikan seluruh data bisnis. Gunakan library `recharts` untuk membuat visualisasi:
> 1. AreaChart untuk tren omzet harian.
> 2. BarChart untuk visualisasi 5 produk terlaris.
> Tambahkan kartu ringkasan stat (KPI Cards) di bagian atas menggunakan Shadcn UI Card untuk menampilkan total pendapatan, total transaksi, nilai total aset gudang, dan counter item bahan baku yang statusnya saat ini 'Restock Needed'."