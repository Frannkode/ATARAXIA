import { z } from "zod";

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "Mínimo 2 caracteres").max(200),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(200)
      .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    sku: z.string().trim().min(1, "Requerido").max(100),
    retailPrice: z.coerce.number().positive("Tiene que ser mayor a 0"),
    wholesalePrice: z.coerce.number().positive().optional().nullable(),
    wholesaleMinQty: z.coerce.number().int().positive().optional().nullable(),
    stock: z.coerce.number().int().min(0, "No puede ser negativo"),
    categoryId: z.uuid().optional().nullable(),
    images: z.array(z.object({ url: z.url() })),
  })
  .refine(
    (data) =>
      (data.wholesalePrice == null && data.wholesaleMinQty == null) ||
      (data.wholesalePrice != null && data.wholesaleMinQty != null),
    {
      message: "Precio mayorista y cantidad mínima van juntos: completá los dos o ninguno.",
      path: ["wholesalePrice"],
    },
  );

export type ProductFormValues = z.infer<typeof productSchema>;
