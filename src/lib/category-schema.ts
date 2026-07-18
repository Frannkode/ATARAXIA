import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
