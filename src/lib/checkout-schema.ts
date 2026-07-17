import { z } from "zod";

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre completo").max(120),
  email: z.string().trim().email("Email inválido"),
  phone: z.string().trim().min(6, "Ingresá un teléfono de contacto").max(30),
  address: z.string().trim().min(10, "Ingresá la dirección completa de envío").max(300),
  idempotencyKey: z.uuid(),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
