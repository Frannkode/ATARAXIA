"use client";

import { useState, useTransition } from "react";
import { createPaymentPreference } from "@/actions/mercadopago";
import { Button } from "@/components/ui/button";

export function PayNowButton({ orderId }: { orderId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await createPaymentPreference(orderId);
      if (result.success && result.initPoint) {
        window.location.href = result.initPoint;
        return;
      }
      setError(result.error ?? "No pudimos generar el link de pago.");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleClick} disabled={isPending}>
        {isPending ? "Generando link de pago..." : "Pagar ahora"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
