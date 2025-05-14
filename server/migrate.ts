import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { db } from "./db";
import { sql } from "drizzle-orm";
import * as fs from "fs/promises";
import * as path from "path";

// Run migrations
async function runMigrations() {
  try {
    console.log("Starting database migrations...");
    
    // Check if tables exist
    console.log("Checking if tables exist...");
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    if (result.rows.length === 0) {
      // Only run initial migration if no tables exist
      console.log("No tables found. Running initial migration...");
      const migrationPath = path.join(process.cwd(), "drizzle", "0000_initial.sql");
      const migrationSql = await fs.readFile(migrationPath, "utf8");
      await db.execute(sql.raw(migrationSql));
      
      console.log("Verifying table creation...");
      const tablesResult = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
      console.log("Created tables:", tablesResult.rows);
    } else {
      console.log("Tables already exist, running incremental migrations...");
      await migrate(db, { migrationsFolder: "./drizzle" });
    }
    
    console.log("Database migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  }
}

runMigrations(); 