import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { hashPassword } from "./hash-password";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import cors from "cors";
import * as fs from "fs/promises";
import * as path from "path";

const app = express();

// Middleware
app.use(cors({
  origin: "http://localhost:5000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Log every incoming /api request
app.use("/api", (req, _res, next) => {
  console.log(`[API REQUEST] ${req.method} ${req.originalUrl}`);
  next();
});

(async () => {
  try {
    // Run migrations if needed
    log("Running database migrations...");
    
    // Read and execute the initial migration only if tables don't exist
    log("Checking if tables exist...");
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    if (result.rows.length === 0) {
      log("No tables found. Running initial migration...");
      const migrationPath = path.join(process.cwd(), "drizzle", "0000_initial.sql");
      const migrationSql = await fs.readFile(migrationPath, "utf8");
      await db.execute(sql.raw(migrationSql));
      
      log("Verifying table creation...");
      const tablesResult = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
      log(`Created tables: ${JSON.stringify(tablesResult.rows)}`);
    } else {
      log("Tables already exist, skipping initial migration");
    }
    
    log("Database migrations completed successfully");

    // Set up authentication
    setupAuth(app);

    // Register other routes
    await registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Global error handler:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Development setup - Vite middleware must be last!
    if (app.get("env") === "development") {
      const server = await setupVite(app);
      const port = 5001;
      server.listen(port, "localhost", () => {
        log(`Server is running on http://localhost:${port}`);
      });
    } else {
      serveStatic(app);
      const port = 5001;
      app.listen(port, "localhost", () => {
        log(`Server is running on http://localhost:${port}`);
      });
    }
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
})();
