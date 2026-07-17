import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";

export interface PaymentRejectedEmailProps {
  orderId: string;
  customerName: string;
  orderUrl: string;
}

export function PaymentRejectedEmail({ orderId, customerName, orderUrl }: PaymentRejectedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>No pudimos procesar tu pago — pedido #{orderId.slice(0, 8)}</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f5f5f5" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "8px" }}>
          <Heading style={{ fontSize: "20px" }}>No pudimos procesar tu pago</Heading>
          <Text>
            Hola {customerName}, tu pago para el pedido #{orderId.slice(0, 8)} no pudo completarse.
          </Text>

          <Hr />

          <Text>
            Liberamos el stock reservado — si querés volver a intentarlo, podés armar el pedido de
            nuevo desde acá: <a href={orderUrl}>{orderUrl}</a>
          </Text>

          <Section style={{ marginTop: "24px" }}>
            <Text style={{ color: "#666", fontSize: "12px" }}>ATARAXIA — cualquier duda, escribinos.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
