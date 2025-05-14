CREATE TABLE IF NOT EXISTS "users" (
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

CREATE TABLE IF NOT EXISTS "approval_types" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "approval_types_name_unique" UNIQUE("name")
);

CREATE TABLE IF NOT EXISTS "mixing_types" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "mixing_types_name_unique" UNIQUE("name")
);

CREATE TABLE IF NOT EXISTS "stations" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" text NOT NULL,
    "name" text NOT NULL,
    "owner" text NOT NULL,
    "tax_number" text NOT NULL,
    "address" text NOT NULL,
    "city_district" text NOT NULL,
    "location" text,
    "distance" numeric NOT NULL,
    "approval_type" text NOT NULL,
    "certificate_expiry_date" timestamp,
    "mixers_count" integer NOT NULL,
    "max_capacity" numeric NOT NULL,
    "mixing_type" text NOT NULL,
    "report_language" text NOT NULL,
    "accommodation" text,
    "representative_name" text NOT NULL,
    "representative_phone" text NOT NULL,
    "representative_id" text NOT NULL,
    "quality_manager_name" text NOT NULL,
    "quality_manager_phone" text NOT NULL,
    "quality_manager_id" text NOT NULL,
    "status" text DEFAULT 'pending-payment' NOT NULL,
    "fees" numeric NOT NULL,
    "request_date" timestamp DEFAULT now() NOT NULL,
    "approval_start_date" timestamp,
    "approval_end_date" timestamp,
    "created_by" integer NOT NULL,
    "committee" jsonb,
    "payment_reference" text,
    "payment_date" timestamp,
    "payment_proof" text,
    "allow_additional_visit" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "stations_code_unique" UNIQUE("code"),
    CONSTRAINT "stations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "payments" (
    "id" serial PRIMARY KEY NOT NULL,
    "station_id" integer NOT NULL,
    "amount" integer NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "payment_method" text,
    "invoice_number" text,
    "invoice_date" timestamp,
    "notes" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "payments_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "visits" (
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
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "visits_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "settings" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" text NOT NULL,
    "value" jsonb NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "settings_key_unique" UNIQUE("key")
);

-- Create the session table with connect-pg-simple schema
CREATE TABLE IF NOT EXISTS "session" (
    "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS=FALSE);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire"); 