import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertStationSchema, 
  insertPaymentSchema, 
  insertVisitSchema, 
  insertSettingsSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // API routes
  // All prefixed with /api
  
  // Stations
  app.get("/api/stations", async (req, res) => {
    try {
      const stations = await storage.listStations();
      res.json(stations);
    } catch (error) {
      console.error("Error fetching stations:", error);
      res.status(500).json({ message: "Failed to fetch stations" });
    }
  });
  
  app.get("/api/stations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const station = await storage.getStation(id);
      
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      res.json(station);
    } catch (error) {
      console.error("Error fetching station:", error);
      res.status(500).json({ message: "Failed to fetch station" });
    }
  });
  
  app.post("/api/stations", async (req, res) => {
    try {
      // Validate request body
      const validatedData = insertStationSchema.parse(req.body);
      
      // Create station
      const station = await storage.createStation(validatedData);
      
      res.status(201).json(station);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating station:", error);
      res.status(500).json({ message: "Failed to create station" });
    }
  });
  
  app.patch("/api/stations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const station = await storage.getStation(id);
      
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      // Update station
      const updatedStation = await storage.updateStation(id, req.body);
      
      res.json(updatedStation);
    } catch (error) {
      console.error("Error updating station:", error);
      res.status(500).json({ message: "Failed to update station" });
    }
  });
  
  app.delete("/api/stations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const station = await storage.getStation(id);
      
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      // Delete station
      await storage.deleteStation(id);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting station:", error);
      res.status(500).json({ message: "Failed to delete station" });
    }
  });
  
  // Payments
  app.get("/api/stations/:stationId/payments", async (req, res) => {
    try {
      const stationId = parseInt(req.params.stationId);
      const station = await storage.getStation(stationId);
      
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      const payments = await storage.listPaymentsByStation(stationId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });
  
  app.post("/api/payments", async (req, res) => {
    try {
      // Validate request body
      const validatedData = insertPaymentSchema.parse(req.body);
      
      // Verify station exists
      const station = await storage.getStation(validatedData.stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      // Create payment
      const payment = await storage.createPayment(validatedData);
      
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating payment:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });
  
  app.patch("/api/payments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const payment = await storage.getPayment(id);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Update payment
      const updatedPayment = await storage.updatePayment(id, req.body);
      
      res.json(updatedPayment);
    } catch (error) {
      console.error("Error updating payment:", error);
      res.status(500).json({ message: "Failed to update payment" });
    }
  });
  
  // Visits
  app.get("/api/stations/:stationId/visits", async (req, res) => {
    try {
      const stationId = parseInt(req.params.stationId);
      const station = await storage.getStation(stationId);
      
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      const visits = await storage.listVisitsByStation(stationId);
      res.json(visits);
    } catch (error) {
      console.error("Error fetching visits:", error);
      res.status(500).json({ message: "Failed to fetch visits" });
    }
  });
  
  app.post("/api/visits", async (req, res) => {
    try {
      // Validate request body
      const validatedData = insertVisitSchema.parse(req.body);
      
      // Verify station exists
      const station = await storage.getStation(validatedData.stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      // Create visit
      const visit = await storage.createVisit(validatedData);
      
      res.status(201).json(visit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating visit:", error);
      res.status(500).json({ message: "Failed to create visit" });
    }
  });
  
  app.patch("/api/visits/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const visit = await storage.getVisit(id);
      
      if (!visit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      // Update visit
      const updatedVisit = await storage.updateVisit(id, req.body);
      
      res.json(updatedVisit);
    } catch (error) {
      console.error("Error updating visit:", error);
      res.status(500).json({ message: "Failed to update visit" });
    }
  });
  
  // Settings
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSetting(key);
      
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });
  
  app.post("/api/settings", async (req, res) => {
    try {
      // Validate request body
      const validatedData = insertSettingsSchema.parse(req.body);
      
      // Create or update setting
      const setting = await storage.setSetting(validatedData);
      
      res.status(200).json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating/updating setting:", error);
      res.status(500).json({ message: "Failed to create/update setting" });
    }
  });
  
  // Users management (admin only)
  app.get("/api/users", async (req, res) => {
    try {
      // Check if user is admin
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const users = await storage.listUsers();
      res.json(users.map(user => ({ ...user, password: undefined })));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  app.patch("/api/users/:id", async (req, res) => {
    try {
      // Check if user is admin
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user
      const updatedUser = await storage.updateUser(id, req.body);
      
      res.json({ ...updatedUser, password: undefined });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  const httpServer = createServer(app);
  
  return httpServer;
}
