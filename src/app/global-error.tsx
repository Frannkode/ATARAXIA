"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-xl font-semibold">Algo salió mal</h1>
          <p className="text-muted-foreground">
            No pudimos cargar el sitio. Probá de nuevo en unos segundos.
          </p>
        </main>
      </body>
    </html>
  );
}
