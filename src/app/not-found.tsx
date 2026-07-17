import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">No encontramos esta página</h1>
      <p className="text-muted-foreground">
        El producto que buscás no existe o ya no está disponible.
      </p>
      <Button asChild>
        <Link href="/">Volver al catálogo</Link>
      </Button>
    </main>
  );
}
