import Link from "next/link";
import { Toaster } from "sonner";
import { requireAdminSession } from "@/lib/require-admin-session";
import { LogoutButton } from "@/components/logout-button";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  // src/proxy.ts ya redirige si no hay cookie de sesión, pero eso es solo un
  // chequeo liviano — esta es la validación real contra la DB. Sin esto, un
  // Server Component que lee datos acá quedaría protegido únicamente por el
  // proxy (hallazgo del /plan-eng-review de este sprint).
  await requireAdminSession();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex gap-4">
            <Link href="/admin/products" className="text-sm font-medium text-foreground">
              Productos
            </Link>
            <Link href="/admin/categories" className="text-sm font-medium text-foreground">
              Categorías
            </Link>
          </div>
          <LogoutButton />
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
