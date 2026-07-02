import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PaginationControls({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Paginación del catálogo"
      className="mt-8 flex items-center justify-center gap-4"
    >
      <Button variant="outline" disabled={!hasPrev} asChild={hasPrev}>
        {hasPrev ? <Link href={`/?page=${page - 1}`}>Anterior</Link> : <span>Anterior</span>}
      </Button>
      <span className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <Button variant="outline" disabled={!hasNext} asChild={hasNext}>
        {hasNext ? <Link href={`/?page=${page + 1}`}>Siguiente</Link> : <span>Siguiente</span>}
      </Button>
    </nav>
  );
}
