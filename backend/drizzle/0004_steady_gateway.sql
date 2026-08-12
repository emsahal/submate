DROP INDEX "notifications_dedup_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedup_idx" ON "notifications" USING btree ("dedup_key","user_id");