import Image from "next/image";

// SVG vectorial (no raster): unoptimized evita que el optimizador de
// imágenes de Next.js lo rechace (por default no procesa SVG, es una
// medida de seguridad pensada para SVGs subidos por usuarios, no aplica
// a un asset propio del proyecto).
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/kode-wordmark.svg"
      alt="KODE"
      width={1774}
      height={887}
      priority
      unoptimized
      className={className}
    />
  );
}
