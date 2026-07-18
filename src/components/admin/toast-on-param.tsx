"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const MESSAGES: Record<string, string> = {
  "category-created": "Categoría creada.",
  "category-updated": "Categoría actualizada.",
  "product-created": "Producto creado.",
  "product-updated": "Producto actualizado.",
};

// Server Actions con redirect() (ver admin-products.ts/admin-categories.ts)
// no pueden mostrar un toast del lado del cliente antes de navegar — este
// componente lee el resultado de la query string del redirect y lo muestra
// ya en la página de destino, después limpia la URL.
export function ToastOnParam() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  // React Strict Mode duplica los efectos en dev — sin esto, el mismo toast
  // se muestra dos veces para un mismo valor de `key`.
  const shownForKey = useRef<string | null>(null);

  useEffect(() => {
    const key = searchParams.get("toast");
    if (!key || shownForKey.current === key) return;
    shownForKey.current = key;

    const message = MESSAGES[key];
    if (message) toast.success(message);
    router.replace(pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}
