CREATE TABLE "recording_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"recording_id" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_path" text NOT NULL,
	"extraction_status" varchar(12) DEFAULT 'pending' NOT NULL,
	"extracted_text" text,
	"extraction_error" text,
	"page_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recording_attachments" ADD CONSTRAINT "recording_attachments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recording_attachments" ADD CONSTRAINT "recording_attachments_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recording_attachments_recording_id_idx" ON "recording_attachments" USING btree ("recording_id");--> statement-breakpoint
CREATE INDEX "recording_attachments_user_id_idx" ON "recording_attachments" USING btree ("user_id");