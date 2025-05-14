import { 
  users, stations, payments, visits, settings, 
  approvalTypes, mixingTypes,
  User, InsertUser, 
  Station, InsertStation, StationStatus,
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

interface AllVisitsResults {
  first6Tests: {
    [key: string]: {
      status: 'passed' | 'failed' | 'pending';
      visitId: number;
      visitDate: Date;
    };
  };
  test7: {
    status: 'passed' | 'failed' | 'pending' | null;
    visitId: number | null;
    visitDate: Date | null;
  };
}

async function calculateAllVisitsResults(tx: any, stationId: number): Promise<AllVisitsResults> {
  // Get all visits for the station, ordered by date and creation time
  const stationVisits = await tx
    .select()
    .from(visits)
    .where(eq(visits.stationId, stationId))
    .orderBy(sql`${visits.visitDate} ASC, ${visits.createdAt} ASC`);

  console.log('Processing visits for station:', {
    stationId,
    visitsCount: stationVisits.length,
    visits: stationVisits.map((v: Visit) => ({
      id: v.id,
      type: v.visitType,
      date: v.visitDate,
      checks: v.checks
    }))
  });

  const firstSixTests = [
    "scale-calibration",
    "press-calibration",
    "uniformity-tests",
    "chloride-sulfate-tests",
    "water-chemical-tests",
    "7day-compression-strength"
  ];

  // Initialize results
  const results: AllVisitsResults = {
    first6Tests: {},
    test7: {
      status: null,
      visitId: null,
      visitDate: null
    }
  };

  // Initialize first 6 tests with pending results
  firstSixTests.forEach(testId => {
    results.first6Tests[testId] = {
      status: 'pending',
      visitId: 0,
      visitDate: new Date(0)
    };
  });

  // Process all visits in chronological order
  for (const visit of stationVisits) {
    if (!visit.checks) continue;

    const visitDate = new Date(visit.visitDate);
    console.log('Processing visit:', {
      visitId: visit.id,
      type: visit.visitType,
      date: visitDate,
      checks: visit.checks
    });

    for (const check of visit.checks) {
      // For first 6 tests
      if (firstSixTests.includes(check.itemId)) {
        // Only update from first visit or if test previously failed
        if (visit.visitType === 'first' || results.first6Tests[check.itemId].status === 'failed') {
          results.first6Tests[check.itemId] = {
            status: check.status as 'passed' | 'failed' | 'pending',
            visitId: visit.id,
            visitDate: visitDate
          };
        }
      }
      // For test 7, always take the most recent result
      else if (check.itemId === "28day-compression-strength") {
        results.test7 = {
          status: check.status as 'passed' | 'failed' | 'pending',
          visitId: visit.id,
          visitDate: visitDate
        };
      }
    }
  }

  console.log('Final calculated results:', {
    stationId,
    firstSixTests: results.first6Tests,
    test7: results.test7,
    visitsProcessed: stationVisits.length
  });

  return results;
}

function determineStationStatus(results: AllVisitsResults): { status: StationStatus; allowAdditionalVisit: boolean } {
  console.log('Determining station status from results:', results);

  // Get results of first 6 tests
  const firstSixTests = [
    "scale-calibration",
    "press-calibration",
    "uniformity-tests",
    "chloride-sulfate-tests",
    "water-chemical-tests",
    "7day-compression-strength"
  ];

  // Check if any test has failed
  const hasFailedTests = Object.entries(results.first6Tests)
    .some(([testId, result]) => result.status === 'failed');

  // Check if all first 6 tests have passed
  const allFirst6Passed = Object.entries(results.first6Tests)
    .every(([testId, result]) => result.status === 'passed');

  // Check if all first 6 tests have results (not pending)
  const allFirst6HaveResults = Object.entries(results.first6Tests)
    .every(([testId, result]) => result.status !== 'pending');

  console.log('Status check:', {
    hasFailedTests,
    allFirst6Passed,
    allFirst6HaveResults,
    test7Status: results.test7.status
  });

  // If any of first 6 tests failed
  if (hasFailedTests) {
    return {
      status: "هناك فشل في بعض التجارب",
      allowAdditionalVisit: true
    };
  }

  // If all first 6 tests have passed
  if (allFirst6Passed) {
    // Check test 7 status - use the most recent result
    if (results.test7.status === 'passed') {
      return {
        status: "تم اعتماد المحطة",
        allowAdditionalVisit: false
      };
    }
    // If test 7 failed or is pending
    else {
      return {
        status: "يمكن للمحطة استخراج خطاب تشغيل",
        allowAdditionalVisit: true
      };
    }
  }

  // If not all first 6 tests have results yet
  if (!allFirst6HaveResults) {
    return {
      status: "تحت الإختبار",
      allowAdditionalVisit: true  // Allow additional visits
    };
  }

  return {
    status: "تحت الإختبار",
    allowAdditionalVisit: true  // Default to allowing additional visits
  };
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
    
    // If station exists and has a committee, add phone numbers
    if (station && station.committee && Array.isArray(station.committee)) {
      const committeeWithPhones = [];
      
      // Use type assertion to avoid TypeScript errors
      const committeeMembers = station.committee as { id?: number; name: string; role: string; phone?: string }[];
      
      for (const member of committeeMembers) {
        if (member.id) {
          const user = await this.getUser(member.id);
          if (user) {
            committeeWithPhones.push({
              ...member,
              phone: user.phone || ""
            });
          } else {
            committeeWithPhones.push(member);
          }
        } else {
          committeeWithPhones.push(member);
        }
      }
      
      station.committee = committeeWithPhones;
    }
    
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
      qualityManagerName, qualityManagerPhone, quality_manager_id: qualityManagerId, accommodation, fees, paymentReference,
      paymentDate, paymentProof, committee, createdBy
    } = insertStation;
    
    // Only include committee if it's an array or null, not undefined
    const values: any = {
      name, owner, taxNumber, address, cityDistrict, location, distance,
      approvalType, certificateExpiryDate, mixersCount, maxCapacity: parseFloat(maxCapacity.toString()), mixingType,
      reportLanguage, representativeName, representativePhone, representativeId,
      qualityManagerName, qualityManagerPhone, quality_manager_id: qualityManagerId, accommodation, fees, paymentReference,
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
      console.log('Current station state:', {
        id,
        oldStatus: oldStation?.status,
        newStatus: data.status,
        oldData: oldStation,
        updateData: data
      });

      return await db.transaction(async (tx) => {
        // Get all visits for the station to recalculate status
        const stationVisits = await tx
          .select()
          .from(visits)
          .where(eq(visits.stationId, id));

        // Calculate results and determine status
        const allResults = await calculateAllVisitsResults(tx, id);
        const { status: calculatedStatus, allowAdditionalVisit } = determineStationStatus(allResults);

        const { committee, ...rest } = data;
        const updateData: Record<string, any> = {
          ...rest,
          // Always use calculated status unless explicitly overridden
          status: data.status || calculatedStatus,
          allowAdditionalVisit,
          updatedAt: new Date(),
        };
        
        if (committee !== undefined) {
          updateData.committee = committee;
        }

        // Update station with calculated status
        const [station] = await tx
          .update(stations)
          .set(updateData)
          .where(eq(stations.id, id))
          .returning();

        console.log('Station updated:', {
          id,
          oldStatus: oldStation?.status,
          calculatedStatus,
          finalStatus: station.status,
          allowAdditionalVisit
        });

        return station;
      });
    } catch (error) {
      console.error('Error updating station:', error);
      throw error;
    }
  }
  
  // Add a new method to force recalculate station status
  async recalculateStationStatus(id: number): Promise<Station | undefined> {
    return this.updateStation(id, {}); // Empty update to trigger recalculation
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
    try {
      const [currentVisit] = await db.select().from(visits).where(eq(visits.id, id));
      if (!currentVisit) return undefined;

      return await db.transaction(async (tx) => {
        // Update visit
        const [visitUpdate] = await tx
          .update(visits)
          .set({
            ...visitData,
            updatedAt: new Date()
          })
          .where(eq(visits.id, id))
          .returning();

        // If visit is completed or has checks, recalculate station status
        if (visitUpdate.status === "completed" || visitData.checks) {
          // Calculate results from all visits
          const allResults = await calculateAllVisitsResults(tx, currentVisit.stationId);
          console.log('All visits results:', allResults);

          // Determine new station status
          const { status: newStatus, allowAdditionalVisit } = determineStationStatus(allResults);
          console.log('Determined new status:', { newStatus, allowAdditionalVisit });

          // Update station status
          const [updatedStation] = await tx
            .update(stations)
            .set({ 
              status: newStatus,
              allowAdditionalVisit,
              updatedAt: new Date()
            })
            .where(eq(stations.id, currentVisit.stationId))
            .returning();

          console.log('Station updated from visit:', {
            stationId: currentVisit.stationId,
            visitId: id,
            newStatus: updatedStation.status,
            allowAdditionalVisit: updatedStation.allowAdditionalVisit
          });
        }

        return visitUpdate;
      });
    } catch (error) {
      console.error('Error in updateVisit:', error);
      throw error;
    }
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
