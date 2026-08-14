CREATE TABLE "account_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"email" text NOT NULL,
	"encrypted_password" text NOT NULL,
	"encryption_iv" text NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"max_slots" integer DEFAULT 5 NOT NULL,
	"used_slots" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "screens" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "inventory_account_id" integer;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "allocated_profile_name" text;--> statement-breakpoint
ALTER TABLE "account_inventory" ADD CONSTRAINT "account_inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_product_idx" ON "account_inventory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_status_idx" ON "account_inventory" USING btree ("status");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_inventory_account_id_account_inventory_id_fk" FOREIGN KEY ("inventory_account_id") REFERENCES "public"."account_inventory"("id") ON DELETE set null ON UPDATE no action;