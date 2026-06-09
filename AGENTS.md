## CONTEXT & OBJECTIVE
Kamu adalah Software Engineer ahli Next.js, TypeScript, dan Prisma. Tugasmu adalah membangun sistem manajemen inventaris bahan baku dan Point of Sales (POS) berbasis Next.js App Router. Sistem ini menerapkan fitur pengurangan stok otomatis (*Auto-Deduction*) berbasis resep (*Bill of Materials*).

## ARCHITECTURAL RULES
1. **Directory Structure:** Gunakan Next.js App Router (`src/app/`, `src/components/`, `src/lib/`, `src/hooks/`).
2. **UI Framework:** Gunakan Tailwind CSS dan komponen berbasis Shadcn UI + Lucide React.
3. **Database Layer:** Gunakan Prisma ORM dengan PostgreSQL/Supabase.
4. **State Management:** Gunakan Zustand untuk mengelola state keranjang belanja Kasir (Cart Store).
5. **Data Isolation:** Fungsi mutasi database untuk transaksi kasir wajib dibungkus dalam `prisma.$transaction`.
6. **Baca Referensi:** Selalu rujuk ke file `project-plan.md` untuk melihat skema database sebelum membuat tabel atau API.