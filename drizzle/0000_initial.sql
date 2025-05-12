CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "stations" (
  "id" SERIAL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "tax_number" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city_district" TEXT NOT NULL,
  "location" TEXT,
  "distance" INTEGER NOT NULL,
  "approval_type" TEXT NOT NULL,
  "certificate_expiry_date" TIMESTAMP,
  "mixers_count" INTEGER NOT NULL,
  "max_capacity" INTEGER NOT NULL,
  "mixing_type" TEXT NOT NULL,
  "report_language" TEXT NOT NULL,
  "representative_name" TEXT NOT NULL,
  "representative_phone" TEXT NOT NULL,
  "representative_id" TEXT NOT NULL,
  "quality_manager_name" TEXT NOT NULL,
  "quality_manager_phone" TEXT NOT NULL,
  "accommodation" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending-payment',
  "fees" INTEGER NOT NULL,
  "request_date" TIMESTAMP NOT NULL DEFAULT now(),
  "approval_start_date" TIMESTAMP,
  "approval_end_date" TIMESTAMP,
  "created_by" INTEGER NOT NULL REFERENCES "users"("id"),
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" SERIAL PRIMARY KEY,
  "station_id" INTEGER NOT NULL REFERENCES "stations"("id"),
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "payment_method" TEXT,
  "invoice_number" TEXT,
  "invoice_date" TIMESTAMP,
  "notes" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "visits" (
  "id" SERIAL PRIMARY KEY,
  "station_id" INTEGER NOT NULL REFERENCES "stations"("id"),
  "visit_type" TEXT NOT NULL,
  "visit_date" TIMESTAMP NOT NULL,
  "visit_time" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "committee" JSONB NOT NULL,
  "checks" JSONB,
  "report" TEXT,
  "certificate_issued" BOOLEAN DEFAULT false,
  "certificate_url" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "settings" (
  "id" SERIAL PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "value" JSONB NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
); 