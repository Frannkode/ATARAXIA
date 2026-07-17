"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { resolveCart, type ResolvedCart } from "@/actions/cart";
import { createOrder } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/cart-store";
import { checkoutSchema } from "@/lib/checkout-schema";
import { formatPrice } from "@/lib/format";

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clear);

  const [resolved, setResolved] = useState<ResolvedCart | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Generado una sola vez al montar el formulario — viaja en cada submit
  // (incluyendo reintentos) para que createOrder detecte un doble-submit.
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  useEffect(() => {
    startTransition(async () => {
      const result = await resolveCart(items);
      setResolved(result);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const parsed = checkoutSchema.safeParse({
      ...form,
      idempotencyKey: idempotencyKeyRef.current,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    startTransition(async () => {
      const result = await createOrder(parsed.data, items);
      if (result.success && result.orderId) {
        clearCart();
        router.push(`/pedidos/${result.orderId}`);
        return;
      }
      setSubmitError(result.error ?? "No pudimos generar tu pedido. Probá de nuevo.");
    });
  }

  if (!resolved && isPending) {
    return <main className="mx-auto max-w-xl px-6 py-10">Cargando...</main>;
  }

  if (!resolved || resolved.items.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          Tu carrito está vacío.{" "}
          <Link href="/" className="text-foreground underline">
            Ver catálogo
          </Link>
        </p>
      </main>
    );
  }

  if (resolved.hasInvalidItems) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          Hay productos en tu carrito que ya no están disponibles.{" "}
          <Link href="/carrito" className="text-foreground underline">
            Volver al carrito
          </Link>{" "}
          para resolverlo antes de pagar.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Checkout</h1>

      <p className="mb-6 text-sm text-muted-foreground">
        Subtotal:{" "}
        <span className="font-medium text-foreground">{formatPrice(resolved.subtotal)}</span>
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Nombre completo
          </label>
          <Input
            id="name"
            value={form.name}
            onChange={(event) => handleChange("name", event.target.value)}
          />
          {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(event) => handleChange("email", event.target.value)}
          />
          {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            Teléfono
          </label>
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(event) => handleChange("phone", event.target.value)}
          />
          {fieldErrors.phone && <p className="text-sm text-destructive">{fieldErrors.phone}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="address" className="text-sm font-medium text-foreground">
            Dirección de envío
          </label>
          <Input
            id="address"
            value={form.address}
            onChange={(event) => handleChange("address", event.target.value)}
          />
          {fieldErrors.address && <p className="text-sm text-destructive">{fieldErrors.address}</p>}
        </div>

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <Button type="submit" disabled={isPending} className="mt-2">
          {isPending ? "Procesando..." : "Confirmar pedido"}
        </Button>
      </form>
    </main>
  );
}
