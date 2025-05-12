import { 
  users, stations, payments, visits, settings, 
  approvalTypes, mixingTypes,
  User, InsertUser, 
  Station, InsertStation,
  Payment, InsertPayment,
  Visit, InsertVisit,
  Settings, InsertSettings,
  ApprovalTypeModel, InsertApprovalType,
  MixingTypeModel, InsertMixingType
} from "@shared/schema";
import session from "express-session";
import { generateStationCode } from "@/lib/utils";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and, sql } from "drizzle-orm";

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
  listPayments(): Promise<Payment[]>;
  
  // Visit operations
  getVisit(id: number): Promise<Visit | undefined>;
  createVisit(visit: InsertVisit): Promise<Visit>;
  updateVisit(id: number, visit: Partial<Visit>): Promise<Visit | undefined>;
  deleteVisit(id: number): Promise<boolean>;
  listVisitsByStation(stationId: number): Promise<Visit[]>;
  listVisits(): Promise<Visit[]>;
  
  // Settings operations
  getSetting(key: string): Promise<Settings | undefined>;
  setSetting(setting: InsertSettings): Promise<Settings>;
  
  // Approval types
  listApprovalTypes(): Promise<any[]>;
  createApprovalType(type: InsertApprovalType): Promise<ApprovalTypeModel>;
  deleteApprovalType(id: number): Promise<boolean>;
  
  // Mixing types
  listMixingTypes(): Promise<any[]>;
  createMixingType(type: InsertMixingType): Promise<MixingTypeModel>;
  deleteMixingType(id: number): Promise<boolean>;
  
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
    let lastStations = await db.select().from(stations).orderBy(stations.id).limit(1);
    let serial = lastStations.length > 0 ? lastStations[0].id + 1 : 1;
    let code = generateStationCode(year, serial);
    // Ensure code uniqueness
    while ((await db.select().from(stations).where(eq(stations.code, code))).length > 0) {
      serial++;
      code = generateStationCode(year, serial);
    }
    
    // Build the values object, only including fields that are in the schema
    const {
      name, owner, taxNumber, address, cityDistrict, location, distance,
      approvalType, certificateExpiryDate, mixersCount, maxCapacity, mixingType,
      reportLanguage, representativeName, representativePhone, representativeId,
      qualityManagerName, qualityManagerPhone, accommodation, fees, paymentReference,
      paymentDate, paymentProof, committee, createdBy
    } = insertStation;
    
    // Only include committee if it's an array or null, not undefined
    const values: any = {
      name, owner, taxNumber, address, cityDistrict, location, distance,
      approvalType, certificateExpiryDate, mixersCount, maxCapacity: parseFloat(maxCapacity.toString()), mixingType,
      reportLanguage, representativeName, representativePhone, representativeId,
      qualityManagerName, qualityManagerPhone, accommodation, fees, paymentReference,
      paymentDate, paymentProof, createdBy,
      code,
      requestDate: now,
      status: "pending-payment",
      createdAt: now,
      updatedAt: now,
    };
    if (typeof committee !== "undefined") {
      values.committee = committee ? (committee as { id: number; name: string; role: string }[]) : null;
    }
    
    const [station] = await db
      .insert(stations)
      .values(values)
      .returning();
    return station;
  }
  
  async updateStation(id: number, data: Partial<Station>) {
    try {
      // Fetch old station for logging
      const oldStation = await this.getStation(id);
      const { committee, ...rest } = data;
      const updateData: Record<string, any> = {
        ...rest,
        updatedAt: new Date(),
      };
      if (committee !== undefined) {
        // Convert committee array to JSONB format
        updateData.committee = committee;
      }
      const [station] = await db
        .update(stations)
        .set(updateData)
        .where(eq(stations.id, id))
        .returning();
      // Log status change
      if (oldStation && data.status && oldStation.status !== data.status) {
        console.log(`[StationStatus] Station ID: ${id} | Old: ${oldStation.status} | New: ${data.status}`);
      }
      return station;
    } catch (error) {
      console.error("Error updating station:", error);
      throw error;
    }
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
        await this.updateStation(station.id, { status: "payment-confirmed" });
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
        await this.updateStation(station.id, { status: "payment-confirmed" });
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
  
  async listPayments(): Promise<Payment[]> {
    return db.select().from(payments);
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
    if (station && station.status === "committee-assigned") {
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
  
  async listVisits(): Promise<Visit[]> {
    return db.select().from(visits);
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
  
  // Approval types
  async listApprovalTypes() {
    return db.select().from(approvalTypes);
  }
  async createApprovalType(type: InsertApprovalType): Promise<ApprovalTypeModel> {
    const now = new Date();
    const [row] = await db.insert(approvalTypes).values({ ...type, createdAt: now, updatedAt: now }).returning();
    return row;
  }
  async deleteApprovalType(id: number): Promise<boolean> {
    await db.delete(approvalTypes).where(eq(approvalTypes.id, id));
    return true;
  }
  // Mixing types
  async listMixingTypes() {
    return db.select().from(mixingTypes);
  }
  async createMixingType(type: InsertMixingType): Promise<MixingTypeModel> {
    const now = new Date();
    const [row] = await db.insert(mixingTypes).values({ ...type, createdAt: now, updatedAt: now }).returning();
    return row;
  }
  async deleteMixingType(id: number): Promise<boolean> {
    await db.delete(mixingTypes).where(eq(mixingTypes.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
