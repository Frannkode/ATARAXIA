"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateShippingStatus } from "@/actions/admin-orders";
import { SHIPPING_STATUS_LABEL } from "@/lib/order-status-labels";

const OPTIONS = ["preparando", "despachado", "entregado"] as const;

export function ShippingStatusSelect({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(newValue: string) {
    setError(null);
    const previous = value;
    setValue(newValue);

    startTransition(async () => {
      const result = await updateShippingStatus(
        orderId,
        newValue as (typeof OPTIONS)[number],
      );
      if (!result.success) {
        setValue(previous);
        setError(result.error ?? "No se pudo actualizar.");
        return;
      }
      toast.success(`Estado de envío: ${SHIPPING_STATUS_LABEL[newValue]}.`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
      >
        {OPTIONS.map((option) => (
          <option key={option} value={option}>
            {SHIPPING_STATUS_LABEL[option]}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
