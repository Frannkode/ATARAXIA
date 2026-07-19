import type { Metadata } from "next";
import Link from "next/link";
import { CartLink } from "@/components/cart-link";
import { Logo } from "@/components/logo";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "KODE",
    template: "%s · KODE",
  },
  description: "KODE — indumentaria",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center">
              <Logo className="h-9 w-auto" />
            </Link>
            <CartLink />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
