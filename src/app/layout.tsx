import type { Metadata } from "next";
import Link from "next/link";
import { CartLink } from "@/components/cart-link";
import { Logo } from "@/components/logo";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const description = "KODE — indumentaria";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "KODE",
    template: "%s · KODE",
  },
  description,
  openGraph: {
    siteName: "KODE",
    title: "KODE",
    description,
    type: "website",
    locale: "es_AR",
  },
  twitter: {
    card: "summary",
    title: "KODE",
    description,
  },
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
