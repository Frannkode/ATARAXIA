"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { buildCatalogHref } from "@/lib/catalog-url";

const DEBOUNCE_MS = 400;

export function SearchInput({
  initialValue,
  categoryId,
}: {
  initialValue?: string;
  categoryId?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue ?? "");
  const skipNextUpdate = useRef(true);

  useEffect(() => {
    // No navegar en el primer render: initialValue ya vino renderizado
    // por el servidor, no hace falta re-pedir la misma página.
    if (skipNextUpdate.current) {
      skipNextUpdate.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      router.replace(buildCatalogHref({ categoryId, search: value.trim() || undefined }));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      type="search"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder="Buscar productos..."
      aria-label="Buscar productos"
      className="max-w-sm"
    />
  );
}
