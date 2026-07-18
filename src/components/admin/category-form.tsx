"use client";

import { useState, useTransition } from "react";
import { createCategory, updateCategory } from "@/actions/admin-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categorySchema } from "@/lib/category-schema";

export function CategoryForm({
  initialValues,
}: {
  initialValues: { id?: string; name: string; slug: string };
}) {
  const [form, setForm] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = categorySchema.safeParse({ name: form.name, slug: form.slug });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    startTransition(async () => {
      // Sin éxito devuelve {success:false, error}; con éxito redirige
      // server-side (redirect() en la action) y esta línea nunca vuelve.
      const result = form.id
        ? await updateCategory(form.id, parsed.data)
        : await createCategory(parsed.data);

      setError(result.error ?? "Algo salió mal.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Nombre
        </label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="slug" className="text-sm font-medium text-foreground">
          Slug
        </label>
        <Input
          id="slug"
          value={form.slug}
          onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
