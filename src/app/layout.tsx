import type { Metadata } from "next";
import Link from "next/link";
import { CartLink } from "@/components/cart-link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ATARAXIA",
    template: "%s · ATARAXIA",
  },
  description: "ATARAXIA — indumentaria",
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
            <Link href="/" className="font-semibold text-foreground">
              ATARAXIA
            </Link>
            <CartLink />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
