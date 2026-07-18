import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Validación real de sesión contra la DB — se llama desde CADA Server Action
 * de admin Y desde el layout de /admin (Server Component), no solo desde uno
 * de los dos. src/proxy.ts solo hace un chequeo liviano de cookie (sin tocar
 * la DB) para la redirección de UX; esta es la autorización de verdad.
 * Un solo nivel de permiso hoy — cualquier sesión válida tiene acceso total.
 *
 * redirect() en vez de un throw común: funciona tanto en el layout (Server
 * Component) como en Server Actions, y evita un error 500 si la sesión
 * expiró — se redirige a login en los dos casos (Historia 4.2).
 */
export async function requireAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}
