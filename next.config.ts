import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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

export default withSentryConfig(nextConfig, {
  // SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN faltan (Historia 6.3, ver
  // .env.example) — sin ellos el plugin solo se salta la subida de
  // sourcemaps con un warning, no rompe el build. widenClientFileUpload es
  // la única opción de las de sourcemaps con soporte en Turbopack (el
  // proyecto usa Turbopack, no webpack).
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
});
