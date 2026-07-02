import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="text-3xl font-semibold text-foreground">Tienda en construcción</h1>
      <p className="max-w-md text-muted-foreground">
        Setup del proyecto (Sprint 1, Historia 1.1) — catálogo, precios y checkout llegan en los
        próximos sprints.
      </p>
      <Button>Placeholder</Button>
    </main>
  );
}
