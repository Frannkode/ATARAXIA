import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/kode-wordmark.png"
      alt="KODE"
      width={1755}
      height={1005}
      priority
      className={className}
    />
  );
}
