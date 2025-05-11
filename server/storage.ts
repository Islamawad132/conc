import { 
  users, stations, payments, visits, settings, 
  User, InsertUser, 
  Station, InsertStation,
  Payment, InsertPayment,
  Visit, InsertVisit,
  Settings, InsertSettings
} from "@shared/schema";
import session from "express-session";
import { generateStationCode } from "@/lib/utils";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and } from "drizzle-orm";

const PostgresSessionStore = connectPg(session);

// Interface defining all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  listUsers(): Promise<User[]>;
  
  // Station operations
  getStation(id: number): Promise<Station | undefined>;
  getStationByCode(code: string): Promise<Station | undefined>;
  createStation(station: InsertStation): Promise<Station>;
  updateStation(id: number, station: Partial<Station>): Promise<Station | undefined>;
  deleteStation(id: number): Promise<boolean>;
  listStations(): Promise<Station[]>;
  
  // Payment operations
  getPayment(id: number): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<Payment>): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<boolean>;
  listPaymentsByStation(stationId: number): Promise<Payment[]>;
  
  // Visit operations
  getVisit(id: number): Promise<Visit | undefined>;
  createVisit(visit: InsertVisit): Promise<Visit>;
  updateVisit(id: number, visit: Partial<Visit>): Promise<Visit | undefined>;
  deleteVisit(id: number): Promise<boolean>;
  listVisitsByStation(stationId: number): Promise<Visit[]>;
  
  // Settings operations
  getSetting(key: string): Promise<Settings | undefined>;
  setSetting(setting: InsertSettings): Promise<Settings>;
  
  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
    
    // Create default admin user if it doesn't exist
    this.getUserByUsername("admin").then(user => {
      if (!user) {
        this.createUser({
          username: "admin",
          password: "admin", // Will be hashed in the auth middleware
          name: "مسؤول النظام",
          role: "admin",
          email: "admin@example.com",
          phone: "01234567890",
        });
      }
    });
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      // Check if the record exists before attempting to delete
      const existingUser = await this.getUser(id);
      if (!existingUser) {
        return false;
      }
      
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }
  
  async listUsers(): Promise<User[]> {
    return db.select().from(users);
  }
  
  // Station operations
  async getStation(id: number): Promise<Station | undefined> {
    const [station] = await db.select().from(stations).where(eq(stations.id, id));
    return station || undefined;
  }
  
  async getStationByCode(code: string): Promise<Station | undefined> {
    const [station] = await db.select().from(stations).where(eq(stations.code, code));
    return station || undefined;
  }
  
  async createStation(insertStation: InsertStation): Promise<Station> {
    const now = new Date();
    const year = now.getFullYear();
    
    // Get the last ID to generate a code
    const lastStations = await db.select().from(stations).orderBy(stations.id).limit(1);
    const lastId = lastStations.length > 0 ? lastStations[0].id + 1 : 1;
    
    // Generate station code
    const code = generateStationCode(year, lastId);
    
    const [station] = await db
      .insert(stations)
      .values({
        ...insertStation,
        code,
        requestDate: now,
        status: "pending-payment",
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return station;
  }
  
  async updateStation(id: number, stationData: Partial<Station>): Promise<Station | undefined> {
    const [updatedStation] = await db
      .update(stations)
      .set({
        ...stationData,
        updatedAt: new Date()
      })
      .where(eq(stations.id, id))
      .returning();
    return updatedStation || undefined;
  }
  
  async deleteStation(id: number): Promise<boolean> {
    try {
      // Check if the record exists before attempting to delete
      const existingStation = await this.getStation(id);
      if (!existingStation) {
        return false;
      }
      
      await db.delete(stations).where(eq(stations.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting station:", error);
      return false;
    }
  }
  
  async listStations(): Promise<Station[]> {
    return db.select().from(stations);
  }
  
  // Payment operations
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }
  
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const now = new Date();
    const [payment] = await db
      .insert(payments)
      .values({
        ...insertPayment,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    
    // Update station status if payment is marked as paid
    if (payment.status === "paid") {
      const station = await this.getStation(payment.stationId);
      if (station && station.status === "pending-payment") {
        await this.updateStation(station.id, { status: "scheduled" });
      }
    }
    
    return payment;
  }
  
  async updatePayment(id: number, paymentData: Partial<Payment>): Promise<Payment | undefined> {
    // Get current payment to check status change
    const [currentPayment] = await db.select().from(payments).where(eq(payments.id, id));
    if (!currentPayment) return undefined;
    
    const [updatedPayment] = await db
      .update(payments)
      .set({
        ...paymentData,
        updatedAt: new Date()
      })
      .where(eq(payments.id, id))
      .returning();
    
    // Update station status if payment status changed to paid
    if (currentPayment.status !== "paid" && updatedPayment.status === "paid") {
      const station = await this.getStation(updatedPayment.stationId);
      if (station && station.status === "pending-payment") {
        await this.updateStation(station.id, { status: "scheduled" });
      }
    }
    
    return updatedPayment || undefined;
  }
  
  async deletePayment(id: number): Promise<boolean> {
    try {
      // Check if the record exists before attempting to delete
      const existingPayment = await this.getPayment(id);
      if (!existingPayment) {
        return false;
      }
      
      await db.delete(payments).where(eq(payments.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting payment:", error);
      return false;
    }
  }
  
  async listPaymentsByStation(stationId: number): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.stationId, stationId));
  }
  
  // Visit operations
  async getVisit(id: number): Promise<Visit | undefined> {
    const [visit] = await db.select().from(visits).where(eq(visits.id, id));
    return visit || undefined;
  }
  
  async createVisit(insertVisit: InsertVisit): Promise<Visit> {
    const now = new Date();
    const [visit] = await db
      .insert(visits)
      .values({
        ...insertVisit,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    
    // Update station status
    const station = await this.getStation(visit.stationId);
    if (station && station.status !== "approved") {
      await this.updateStation(station.id, { status: "scheduled" });
    }
    
    return visit;
  }
  
  async updateVisit(id: number, visitData: Partial<Visit>): Promise<Visit | undefined> {
    // Get current visit to check status change
    const [currentVisit] = await db.select().from(visits).where(eq(visits.id, id));
    if (!currentVisit) return undefined;
    
    const [updatedVisit] = await db
      .update(visits)
      .set({
        ...visitData,
        updatedAt: new Date()
      })
      .where(eq(visits.id, id))
      .returning();
    
    // Update station status if visit completed
    if (currentVisit.status !== "completed" && updatedVisit.status === "completed") {
      const station = await this.getStation(currentVisit.stationId);
      if (station) {
        await this.updateStation(station.id, { status: "visited" });
      }
    }
    
    // Update station if certificate issued
    if (!currentVisit.certificateIssued && updatedVisit.certificateIssued) {
      const station = await this.getStation(currentVisit.stationId);
      if (station) {
        await this.updateStation(station.id, { 
          status: "approved",
          approvalStartDate: new Date(),
          // Set approval end date to one year minus one day from start date
          approvalEndDate: new Date(Date.now() + 364 * 24 * 60 * 60 * 1000)
        });
      }
    }
    
    return updatedVisit;
  }
  
  async deleteVisit(id: number): Promise<boolean> {
    try {
      // Check if the record exists before attempting to delete
      const existingVisit = await this.getVisit(id);
      if (!existingVisit) {
        return false;
      }
      
      await db.delete(visits).where(eq(visits.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting visit:", error);
      return false;
    }
  }
  
  async listVisitsByStation(stationId: number): Promise<Visit[]> {
    return db.select().from(visits).where(eq(visits.stationId, stationId));
  }
  
  // Settings operations
  async getSetting(key: string): Promise<Settings | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }
  
  async setSetting(insertSetting: InsertSettings): Promise<Settings> {
    // Check if setting exists
    const existingSetting = await this.getSetting(insertSetting.key);
    
    if (existingSetting) {
      // Update existing setting
      const [updatedSetting] = await db
        .update(settings)
        .set({
          value: insertSetting.value,
          updatedAt: new Date()
        })
        .where(eq(settings.id, existingSetting.id))
        .returning();
      return updatedSetting;
    }
    
    // Create new setting
    const now = new Date();
    const [setting] = await db
      .insert(settings)
      .values({
        ...insertSetting,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return setting;
  }
}

export const storage = new DatabaseStorage();
