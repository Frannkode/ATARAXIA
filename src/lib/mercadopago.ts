import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN ?? "";

const config = new MercadoPagoConfig({ accessToken });

export const preferenceClient = new Preference(config);
export const paymentClient = new Payment(config);

// account_money: saldo en cuenta de MercadoPago. Excluye ticket (Rapipago,
// Pago Facil, efectivo) y bank_transfer/atm porque tardan 1-3 dias en
// acreditarse — la expiracion por abandono (Historia 3.3) asume que un pago
// no resuelto en minutos/horas fue abandonado, lo cual no es cierto para
// estos metodos.
export const EXCLUDED_PAYMENT_TYPES = [{ id: "ticket" }, { id: "atm" }, { id: "bank_transfer" }];
