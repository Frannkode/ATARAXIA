"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { overrideOrderStatusAction } from "@/actions/admin-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ORDER_STATUS_LABEL } from "@/lib/order-status-labels";

const STATUSES = ["pendiente_pago", "pagado", "rechazado", "en_proceso"] as const;

export function OverrideOrderStatusForm({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await overrideOrderStatusAction(
        orderId,
        newStatus as (typeof STATUSES)[number],
        reason.trim() || undefined,
      );
      if (!result.success) {
        setError(result.error ?? "No se pudo cambiar el estado.");
        return;
      }
      toast.success(`Estado forzado a "${ORDER_STATUS_LABEL[newStatus]}".`);
      setReason("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <p className="text-sm font-medium text-foreground">Forzar estado manualmente</p>
      <select
        value={newStatus}
        onChange={(e) => setNewStatus(e.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
      >
        {STATUSES.map((status) => (
          <option key={status} value={status}>
            {ORDER_STATUS_LABEL[status]}
          </option>
        ))}
      </select>
      <Input
        placeholder="Motivo (opcional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="outline" disabled={isPending || newStatus === currentStatus}>
        {isPending ? "Aplicando..." : "Forzar estado"}
      </Button>
    </form>
  );
}
