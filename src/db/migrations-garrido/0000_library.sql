CREATE TABLE "library_folders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" text,
	"name" text NOT NULL,
	"color" varchar(20) DEFAULT 'gray' NOT NULL,
	"icon" varchar(40) DEFAULT 'folder' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"plaud_node_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "library_folders_user_plaud_node_unique" UNIQUE("user_id","plaud_node_id")
);
--> statement-breakpoint
CREATE TABLE "library_recording_folders" (
	"recording_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"folder_id" text NOT NULL,
	"source" varchar(10) DEFAULT 'manual' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "library_folders" ADD CONSTRAINT "library_folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_folders" ADD CONSTRAINT "library_folders_parent_id_library_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."library_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_recording_folders" ADD CONSTRAINT "library_recording_folders_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_recording_folders" ADD CONSTRAINT "library_recording_folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_recording_folders" ADD CONSTRAINT "library_recording_folders_folder_id_library_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."library_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "library_folders_user_id_idx" ON "library_folders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "library_folders_parent_id_idx" ON "library_folders" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "library_recording_folders_folder_id_idx" ON "library_recording_folders" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "library_recording_folders_user_id_idx" ON "library_recording_folders" USING btree ("user_id");