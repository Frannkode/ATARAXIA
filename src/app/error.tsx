"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">Algo salió mal</h1>
      <p className="text-muted-foreground">
        No pudimos cargar esta página. Probá de nuevo en unos segundos.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </main>
  );
}
