import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { CartLink } from "@/components/cart-link";
import { CategoryNav } from "@/components/category-nav";
import { Logo } from "@/components/logo";
import { getCategories } from "@/db/queries/categories";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const getCachedCategories = cache(getCategories);

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const categories = await getCachedCategories();

  return (
    <html lang="es">
      <body>
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center">
                <Logo className="h-9 w-auto" />
              </Link>
              <CategoryNav categories={categories} />
            </div>
            <CartLink />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
