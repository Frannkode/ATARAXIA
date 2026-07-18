import Link from "next/link";

export const metadata = {
  title: "Política de cambios y devoluciones",
};

export default function PoliticaDeCambiosPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        Política de cambios y devoluciones
      </h1>

      <div className="flex flex-col gap-4 text-sm text-foreground">
        <p>
          En KODE queremos que estés conforme con tu compra. Si no es así, contás con las
          siguientes opciones:
        </p>

        <section className="flex flex-col gap-1">
          <h2 className="font-medium">Derecho de arrepentimiento (10 días)</h2>
          <p className="text-muted-foreground">
            De acuerdo con la Ley de Defensa del Consumidor (Ley 24.240, art. 34), al tratarse de
            una compra a distancia tenés derecho a arrepentirte de la compra dentro de los 10 días
            corridos desde que recibís el producto, sin tener que dar ningún motivo. Para
            ejercerlo, escribinos por los canales de contacto indicados más abajo.
          </p>
        </section>

        <section className="flex flex-col gap-1">
          <h2 className="font-medium">Condiciones para el cambio o la devolución</h2>
          <ul className="list-disc pl-5 text-muted-foreground">
            <li>El producto no debe estar usado ni lavado.</li>
            <li>Debe conservar sus etiquetas originales.</li>
            <li>Se debe presentar el comprobante de compra (número de pedido o email de confirmación).</li>
          </ul>
        </section>

        <section className="flex flex-col gap-1">
          <h2 className="font-medium">Costo de envío de la devolución</h2>
          <p className="text-muted-foreground">
            El costo de envío para cambios o devoluciones corre por cuenta del comprador, salvo
            que el producto presente una falla o hayamos cometido un error en el envío.
          </p>
        </section>

        <section className="flex flex-col gap-1">
          <h2 className="font-medium">Reintegro</h2>
          <p className="text-muted-foreground">
            Una vez que recibimos y verificamos el producto, el reintegro se realiza por el mismo
            medio de pago utilizado en la compra, dentro de los 10 días hábiles siguientes.
          </p>
        </section>

        <p className="text-xs text-muted-foreground">
          Este texto es un modelo general basado en la normativa vigente y todavía no fue
          revisado por el dueño de la tienda — los plazos y condiciones específicas pueden
          ajustarse antes de la publicación final.
        </p>
      </div>

      <Link href="/" className="mt-8 inline-block text-sm text-foreground underline">
        Volver al catálogo
      </Link>
    </main>
  );
}
