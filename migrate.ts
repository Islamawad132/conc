import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { db } from "./server/db";

// Run migrations
async function main() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations completed!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error running migrations:", err);
  process.exit(1);
}); 