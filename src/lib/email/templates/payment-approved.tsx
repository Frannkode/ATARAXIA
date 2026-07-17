import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import { formatPrice } from "@/lib/format";

export interface PaymentApprovedEmailProps {
  orderId: string;
  customerName: string;
  items: { productName: string; quantity: number; lineTotal: string }[];
  subtotal: string;
  orderUrl: string;
}

export function PaymentApprovedEmail({
  orderId,
  customerName,
  items,
  subtotal,
  orderUrl,
}: PaymentApprovedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu pago fue aprobado — pedido #{orderId.slice(0, 8)}</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f5f5f5" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "8px" }}>
          <Heading style={{ fontSize: "20px" }}>¡Tu pago fue aprobado!</Heading>
          <Text>Hola {customerName}, confirmamos tu pago para el pedido #{orderId.slice(0, 8)}.</Text>

          <Hr />

          {items.map((item) => (
            <Text key={item.productName} style={{ margin: "4px 0" }}>
              {item.productName} × {item.quantity} — {formatPrice(item.lineTotal)}
            </Text>
          ))}

          <Hr />

          <Text style={{ fontWeight: "bold" }}>Total: {formatPrice(subtotal)}</Text>

          <Text>
            Podés ver el detalle de tu pedido acá: <a href={orderUrl}>{orderUrl}</a>
          </Text>

          <Section style={{ marginTop: "24px" }}>
            <Text style={{ color: "#666", fontSize: "12px" }}>ATARAXIA — gracias por tu compra.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
