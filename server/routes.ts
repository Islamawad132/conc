import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertStationSchema, 
  insertPaymentSchema, 
  insertVisitSchema, 
  insertSettingsSchema,
  insertUserSchema,
  type Visit,
  type Payment
} from "@shared/schema";
import express from "express";
import multer from "multer";
import path from "path";
import { WebSocketServer } from "ws";
import { hashPassword } from "./hash-password";
import { eq } from "drizzle-orm";
import { db } from "./db";

const app = express();

// Configure multer for file uploads
const uploadStorage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, "uploads/");
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: uploadStorage });

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // API routes
  // All prefixed with /api
  
  // Dashboard Stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stations = await storage.listStations();
      const visits = await storage.listVisits();
      const payments = await storage.listPayments();
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      const thirtyDaysLater = new Date(today);
      thirtyDaysLater.setDate(today.getDate() + 30);

      // إجمالي المحطات
      const totalStations = stations.length;
      // طلبات قيد الانتظار: pending-payment أو pending-documents
      const pendingRequests = stations.filter(s => s.status === "pending-payment" || s.status === "pending-documents").length;
      // زيارات هذا الأسبوع: زيارات مجدولة أو مكتملة خلال آخر 7 أيام
      const weekVisits = visits.filter(v => {
        const visitDate = new Date(v.visitDate);
        return visitDate >= weekAgo && visitDate <= today && (v.status === "scheduled" || v.status === "completed");
      }).length;
      // شهادات تنتهي خلال شهر: approvalEndDate خلال 30 يوم قادمة
      const expiringCertificates = stations.filter(s => {
        if (!s.approvalEndDate) return false;
        const endDate = new Date(s.approvalEndDate);
        return endDate >= today && endDate <= thirtyDaysLater;
      }).length;
      // المدفوعات المعلقة
      const pendingPayments = payments.filter(p => p.status === "pending").length;
      // زيارات مكتملة
      const completedVisits = visits.filter(v => v.status === "completed").length;
      // زيارات مجدولة
      const scheduledVisits = visits.filter(v => v.status === "scheduled").length;
      // محطات معتمدة
      const approvedStations = stations.filter(s => s.status === "approved").length;
      // محطات غير معتمدة
      const unapprovedStations = stations.filter(s => s.status !== "approved").length;
      // محطات المستخدم (للعميل)
      let myStations = 0;
      let pendingVisitStations = 0;
      let expiredStations = 0;
      const user = (req as any).user as { id?: number } | undefined;
      if (user && typeof user.id === 'number') {
        myStations = stations.filter(s => s.createdBy === user.id).length;
        pendingVisitStations = stations.filter(s => s.createdBy === user.id && s.status === "scheduled").length;
        expiredStations = stations.filter(s => {
          if (!s.approvalEndDate) return false;
          const endDate = new Date(s.approvalEndDate);
          return endDate < today && s.createdBy === user.id;
        }).length;
      }

      const stats = {
        totalStations,
        approvedStations,
        unapprovedStations,
        pendingRequests,
        weekVisits,
        expiringCertificates,
        pendingPayments,
        completedVisits,
        scheduledVisits,
        myStations,
        pendingVisitStations,
        expiredStations,
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Station Status Statistics
  app.get("/api/stations/stats", async (req, res) => {
    try {
      console.log("Fetching station statistics...");
      const stations = await storage.listStations();
      console.log(`Found ${stations.length} stations`);
      
      const stats = {
        totalStations: stations.length,
        approvedStations: stations.filter(s => s.status === "approved").length,
        unapprovedStations: stations.filter(s => s.status !== "approved").length
      };
      
      console.log("Station statistics:", stats);
      res.json(stats);
    } catch (error) {
      console.error("Error in /api/stations/stats:", error);
      res.status(500).json({ 
        message: "Failed to fetch station statistics",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Upcoming Visits
  app.get("/api/visits", async (req, res) => {
    try {
      const visits = await storage.listVisits();
      const upcomingVisits = visits
        .filter(v => v.status === "scheduled")
        .map(async v => {
          const station = await storage.getStation(v.stationId);
          return {
            ...v,
            stationName: station?.name || "Unknown Station"
          };
        });

      const visitsWithStationNames = await Promise.all(upcomingVisits);
      res.json(visitsWithStationNames);
    } catch (error) {
      console.error("Error fetching upcoming visits:", error);
      res.status(500).json({ message: "Failed to fetch upcoming visits" });
    }
  });
  
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
      // Convert visitDate from ISO string to Date object
      const visitData = {
        ...req.body,
        visitDate: new Date(req.body.visitDate)
      };
      
      // Validate request body
      const validatedData = insertVisitSchema.parse(visitData);
      
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
      
      // إذا تم إرسال stationStatus، حدث حالة المحطة
      if (req.body.stationStatus) {
        const updateData: any = {
          status: req.body.stationStatus
        };
        
        // إذا كان هناك سماح بزيارة إضافية
        if (typeof req.body.allowAdditionalVisit === 'boolean') {
          updateData.allowAdditionalVisit = req.body.allowAdditionalVisit;
        }
        
        await storage.updateStation(visit.stationId, updateData);
      }

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
  
  app.post("/api/users", async (req, res) => {
    try {
      // Check if user is admin
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Validate request body
      const validatedData = insertUserSchema.parse(req.body);

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "اسم المستخدم موجود بالفعل" });
      }

      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);

      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      res.status(201).json({ ...user, password: undefined });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
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
  
  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const stats = {
        totalStations: 0,
        pendingRequests: 0,
        weekVisits: 0,
        expiringCertificates: 0,
        pendingPayments: 0,
        completedVisits: 0,
        scheduledVisits: 0,
        approvedStations: 0,
        myStations: 0,
        pendingVisitStations: 0,
        expiredStations: 0,
      };

      // Get all stations
      const allStations = await storage.listStations();
      
      // Get all visits
      const allVisits = await storage.listVisits();
      
      // Get all payments
      const allPayments = await storage.listPayments();

      // Calculate total stations
      stats.totalStations = allStations.length;

      // Calculate pending requests (stations with pending-documents status)
      stats.pendingRequests = allStations.filter(s => s.status === "pending-documents").length;

      // Calculate week visits (visits scheduled within the next 7 days)
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      stats.weekVisits = allVisits.filter((v: Visit) => {
        const visitDate = new Date(v.visitDate);
        return visitDate >= today && visitDate <= nextWeek && v.status === "scheduled";
      }).length;

      // Calculate expiring certificates (stations with certificates expiring within 30 days)
      const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      stats.expiringCertificates = allStations.filter(s => {
        if (!s.certificateExpiryDate) return false;
        const expiryDate = new Date(s.certificateExpiryDate);
        return expiryDate >= today && expiryDate <= thirtyDaysLater;
      }).length;

      // Calculate pending payments
      stats.pendingPayments = allPayments.filter((p: Payment) => p.status === "pending").length;

      // Calculate completed visits
      stats.completedVisits = allVisits.filter((v: Visit) => v.status === "completed").length;

      // Calculate scheduled visits
      stats.scheduledVisits = allVisits.filter((v: Visit) => v.status === "scheduled").length;

      // Calculate approved stations
      stats.approvedStations = allStations.filter(s => s.status === "approved").length;

      // For client role, calculate their specific stats
      if (user.role === "client") {
        // Calculate my stations
        stats.myStations = allStations.filter(s => s.createdBy === user.id).length;

        // Calculate pending visit stations
        stats.pendingVisitStations = allStations.filter(s => 
          s.createdBy === user.id && s.status === "scheduled"
        ).length;

        // Calculate expired stations
        stats.expiredStations = allStations.filter(s => {
          if (!s.certificateExpiryDate) return false;
          const expiryDate = new Date(s.certificateExpiryDate);
          return expiryDate < today && s.createdBy === user.id;
        }).length;
      }

      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Recent stations
  app.get("/api/dashboard/recent-stations", async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Only admin and secretary can access recent stations
      if (user.role !== "admin" && user.role !== "secretary") {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get the 5 most recent stations
      const recentStations = await storage.listStations().then(stations => 
        stations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
      );

      res.json(recentStations);
    } catch (error) {
      console.error("Error fetching recent stations:", error);
      res.status(500).json({ message: "Failed to fetch recent stations" });
    }
  });
  
  // Payment confirmation endpoint
  app.post("/api/stations/:id/confirm-payment", upload.single("paymentProof"), async (req: Request & { file?: Express.Multer.File }, res) => {
    try {
      const stationId = parseInt(req.params.id);
      const { referenceNumber, referenceDate } = req.body;
      const paymentProof = req.file?.path;

      if (!referenceNumber || !referenceDate || !paymentProof) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const station = await storage.updateStation(stationId, {
        paymentReference: referenceNumber,
        paymentDate: new Date(referenceDate),
        paymentProof,
        status: "payment-confirmed", // Update status to payment-confirmed after payment confirmation
      });

      if (!station) {
        return res.status(404).json({ error: "Station not found" });
      }

      res.json(station);
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Committee assignment endpoint
  app.post("/api/stations/:id/assign-committee", async (req, res) => {
    try {
      const stationId = parseInt(req.params.id);
      const { chairman, engineer, secretary } = req.body;

      if (!chairman || !engineer || !secretary) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Fetch committee members from our database
      const [chairmanUser, engineerUser, secretaryUser] = await Promise.all([
        storage.getUser(parseInt(chairman)),
        storage.getUser(parseInt(engineer)),
        storage.getUser(parseInt(secretary))
      ]);

      if (!chairmanUser || !engineerUser || !secretaryUser) {
        return res.status(400).json({ error: "One or more committee members not found" });
      }

      // Create committee array with exact structure as defined in schema
      const committee = [
        { 
          id: parseInt(chairman), 
          name: chairmanUser.name, 
          role: "chairman" 
        },
        { 
          id: parseInt(engineer), 
          name: engineerUser.name, 
          role: "engineer" 
        },
        { 
          id: parseInt(secretary), 
          name: secretaryUser.name, 
          role: "secretary" 
        }
      ];

      // Update station with committee and status
      const station = await storage.updateStation(stationId, {
        committee,
        status: "committee-assigned"
      });

      if (!station) {
        return res.status(404).json({ error: "Station not found" });
      }

      res.json(station);
    } catch (error) {
      console.error("Error assigning committee:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get committee members endpoint
  app.get("/api/committee-members", async (req, res) => {
    try {
      // Fetch committee members from users table
      const users = await storage.listUsers();
      // Only return users with roles suitable for committee
      const committeeRoles = ["chairman", "engineer", "secretary"];
      const members = users
        .filter(user => committeeRoles.includes(user.role))
        .map(user => ({ id: user.id, name: user.name, role: user.role }));
      res.json(members);
    } catch (error) {
      console.error("Error fetching committee members:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Approval Types endpoints
  app.get("/api/approval-types", async (req, res) => {
    try {
      const types = await storage.listApprovalTypes();
      res.json(types);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch approval types" });
    }
  });
  app.post("/api/approval-types", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { name } = req.body;
      if (!name) return res.status(400).json({ message: "Name is required" });
      const type = await storage.createApprovalType({ name });
      res.status(201).json(type);
    } catch (error) {
      res.status(500).json({ message: "Failed to create approval type" });
    }
  });
  app.delete("/api/approval-types/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteApprovalType(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete approval type" });
    }
  });

  // Mixing Types endpoints
  app.get("/api/mixing-types", async (req, res) => {
    try {
      const types = await storage.listMixingTypes();
      res.json(types);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mixing types" });
    }
  });
  app.post("/api/mixing-types", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { name } = req.body;
      if (!name) return res.status(400).json({ message: "Name is required" });
      const type = await storage.createMixingType({ name });
      res.status(201).json(type);
    } catch (error) {
      res.status(500).json({ message: "Failed to create mixing type" });
    }
  });
  app.delete("/api/mixing-types/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteMixingType(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete mixing type" });
    }
  });
  
  const httpServer = createServer(app);
  
  return httpServer;
}
