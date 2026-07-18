"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { adjustProductStock } from "@/actions/admin-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StockAdjuster({ productId }: { productId: string }) {
  const router = useRouter();
  const [delta, setDelta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedDelta = Number(delta);
    if (!Number.isInteger(parsedDelta) || parsedDelta === 0) {
      setError("Ingresá un número entero distinto de cero (ej. 10 o -3).");
      return;
    }

    startTransition(async () => {
      const result = await adjustProductStock(productId, parsedDelta);
      if (!result.success) {
        setError(result.error ?? "No se pudo ajustar.");
        return;
      }
      toast.success(`Stock ajustado (${parsedDelta > 0 ? "+" : ""}${parsedDelta}).`);
      setDelta("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        type="number"
        placeholder="+10 / -3"
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
        className="w-24"
      />
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        Ajustar
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
