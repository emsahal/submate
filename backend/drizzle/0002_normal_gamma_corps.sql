ALTER TYPE "public"."payment_method_type" ADD VALUE 'NAYAPAY' BEFORE 'OTHER';--> statement-breakpoint
CREATE TABLE "otp_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"gmail_message_id" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"request_number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "otp_requests" ADD CONSTRAINT "otp_requests_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_requests" ADD CONSTRAINT "otp_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "otp_subs_idx" ON "otp_requests" USING btree ("subscription_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "otp_gmail_msg_idx" ON "otp_requests" USING btree ("gmail_message_id");