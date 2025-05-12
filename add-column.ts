import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function addColumn() {
  try {
    console.log("Adding allow_additional_visit column...");
    await db.execute(sql`ALTER TABLE stations ADD COLUMN IF NOT EXISTS allow_additional_visit boolean DEFAULT false;`);
    console.log("Column added successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error adding column:", error);
    process.exit(1);
  }
}

addColumn(); 