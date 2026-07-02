import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      // placehold.co: solo para las imágenes de placeholder del seed de
      // desarrollo (src/db/seed.ts). Sacar cuando el catálogo tenga fotos
      // reales subidas a Cloudinary.
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
};

export default nextConfig;
