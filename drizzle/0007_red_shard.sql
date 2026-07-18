CREATE TYPE "public"."shipping_status" AS ENUM('preparando', 'despachado', 'entregado');--> statement-breakpoint
CREATE TABLE "order_status_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"changed_by_user_id" text NOT NULL,
	"from_status" "order_status" NOT NULL,
	"to_status" "order_status" NOT NULL,
	"reason" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_status" "shipping_status" DEFAULT 'preparando' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_status_audit_log" ADD CONSTRAINT "order_status_audit_log_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_audit_log" ADD CONSTRAINT "order_status_audit_log_changed_by_user_id_user_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;