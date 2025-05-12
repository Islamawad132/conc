CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"invoice_number" text,
	"invoice_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"owner" text NOT NULL,
	"tax_number" text NOT NULL,
	"address" text NOT NULL,
	"city_district" text NOT NULL,
	"location" text,
	"distance" integer NOT NULL,
	"approval_type" text NOT NULL,
	"certificate_expiry_date" timestamp,
	"mixers_count" integer NOT NULL,
	"max_capacity" numeric(4, 2) NOT NULL,
	"mixing_type" text NOT NULL,
	"report_language" text NOT NULL,
	"representative_name" text NOT NULL,
	"representative_phone" text NOT NULL,
	"representative_id" text NOT NULL,
	"quality_manager_name" text NOT NULL,
	"quality_manager_phone" text NOT NULL,
	"accommodation" text,
	"status" text DEFAULT 'pending-payment' NOT NULL,
	"fees" integer NOT NULL,
	"request_date" timestamp DEFAULT now() NOT NULL,
	"approval_start_date" timestamp,
	"approval_end_date" timestamp,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"payment_reference" text,
	"payment_date" timestamp,
	"payment_proof" text,
	"committee" jsonb,
	CONSTRAINT "stations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"email" text,
	"phone" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"visit_type" text NOT NULL,
	"visit_date" timestamp NOT NULL,
	"visit_time" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"committee" jsonb NOT NULL,
	"checks" jsonb,
	"report" text,
	"certificate_issued" boolean DEFAULT false,
	"certificate_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;