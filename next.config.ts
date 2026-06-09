import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.loca.lt"],
  // Gunakan Webpack alih-alih Turbopack untuk menghemat RAM
  // Turbopack (default Next.js 16) mengkonsumsi RAM sangat besar
  // yang bisa menyebabkan laptop lag/crash
  experimental: {
    // Nonaktifkan fitur yang tidak diperlukan untuk hemat resource
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
