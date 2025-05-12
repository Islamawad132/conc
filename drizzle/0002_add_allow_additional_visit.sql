-- Add allow_additional_visit column to stations table
ALTER TABLE "stations" ADD COLUMN "allow_additional_visit" boolean DEFAULT false; 