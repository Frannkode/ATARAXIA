CREATE TABLE "order_rate_limit_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "order_rate_limit_ip_created_at_idx" ON "order_rate_limit_attempts" USING btree ("ip_address","created_at");