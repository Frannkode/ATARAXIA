"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout}>
      Cerrar sesión
    </Button>
  );
}
