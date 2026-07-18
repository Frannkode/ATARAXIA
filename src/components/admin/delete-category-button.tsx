"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createCategory, deleteCategory } from "@/actions/admin-categories";
import { Button } from "@/components/ui/button";

interface DeleteCategoryButtonProps {
  categoryId: string;
  name: string;
  slug: string;
}

export function DeleteCategoryButton({ categoryId, name, slug }: DeleteCategoryButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUndo() {
    startTransition(async () => {
      // No es un undo transaccional: recrea la categoría con el mismo
      // nombre/slug, pero con un id nuevo (la fila original ya se borró de
      // verdad). Suficiente para el caso de uso — deshacer un click
      // apurado — no para restaurar referencias de productos ya inactivos
      // que apuntaran al id viejo.
      await createCategory({ name, slug }).catch(() => {
        // createCategory redirige en éxito (throw NEXT_REDIRECT) — cualquier
        // otro throw real ya lo logueó la propia action.
      });
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCategory(categoryId);
      if (!result.success) {
        setError(result.error ?? "No se pudo borrar.");
        return;
      }
      router.refresh();
      toast.success(`Categoría "${name}" eliminada.`, {
        duration: 8000,
        action: { label: "Deshacer", onClick: handleUndo },
      });
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={handleDelete} disabled={isPending}>
        Borrar
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
