CREATE TABLE "approval_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "mixing_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mixing_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "stations" ALTER COLUMN "distance" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "stations" ALTER COLUMN "max_capacity" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "stations" ALTER COLUMN "fees" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "allow_additional_visit" boolean DEFAULT false;