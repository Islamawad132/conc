import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import * as schema from "@shared/schema";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { sql } from "drizzle-orm";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { hashPassword } from "./hash-password";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import cors from "cors";

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
    // Check if tables exist before running migrations
    try {
      log("Checking database tables...");
      await db.execute(sql`SELECT 1 FROM ${schema.users} LIMIT 1`);
      log("Database tables already exist, skipping migrations");
    } catch (error) {
      // If table doesn't exist, run migrations
      log("Creating database tables...");
      await migrate(db, { migrationsFolder: "./drizzle" });
      log("Database tables created successfully");
    }

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
      const port = 5000;
      server.listen({
        port,
        host: "0.0.0.0",
        reusePort: true,
      }, () => {
        log(`Server is running on port ${port}`);
      });
    } else {
      serveStatic(app);
      const port = 5000;
      app.listen(port, () => {
        log(`Server is running on port ${port}`);
      });
    }
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
})();
