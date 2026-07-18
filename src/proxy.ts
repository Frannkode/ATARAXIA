import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renombró middleware.ts a proxy.ts y lo redujo a un "thin proxy"
// — no está pensado para chequeos pesados de sesión contra la DB. Esto es
// solo un chequeo liviano de presencia de cookie para la redirección de UX;
// la autorización real vive en requireAdminSession() (Server Actions y el
// layout de /admin), que sí valida contra la DB.
export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
