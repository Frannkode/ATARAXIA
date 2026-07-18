import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import { EMAIL_BRAND_COLORS } from "@/lib/email/brand-colors";

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
      <Body
        style={{
          fontFamily: "sans-serif",
          backgroundColor: EMAIL_BRAND_COLORS.background,
          color: EMAIL_BRAND_COLORS.text,
        }}
      >
        <Container
          style={{
            backgroundColor: EMAIL_BRAND_COLORS.cardBackground,
            padding: "24px",
            borderRadius: "8px",
            borderTop: `4px solid ${EMAIL_BRAND_COLORS.destructive}`,
          }}
        >
          <Heading style={{ fontSize: "20px", color: EMAIL_BRAND_COLORS.text }}>
            No pudimos procesar tu pago
          </Heading>
          <Text>
            Hola {customerName}, tu pago para el pedido #{orderId.slice(0, 8)} no pudo completarse.
          </Text>

          <Hr />

          <Text>
            Liberamos el stock reservado — si querés volver a intentarlo, podés armar el pedido de
            nuevo desde acá: <a href={orderUrl}>{orderUrl}</a>
          </Text>

          <Section style={{ marginTop: "24px" }}>
            <Text style={{ color: EMAIL_BRAND_COLORS.mutedText, fontSize: "12px" }}>
              ATARAXIA — cualquier duda, escribinos.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
