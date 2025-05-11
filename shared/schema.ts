import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User role type
export type UserRole = "admin" | "secretary" | "engineer" | "client";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "secretary", "engineer", "client"] }).notNull(),
  email: text("email"),
  phone: text("phone"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
  email: true,
  phone: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Station status type
export type StationStatus = 
  | "pending-payment" 
  | "scheduled" 
  | "visited" 
  | "approved" 
  | "pending-documents";

// Approval type
export type ApprovalType = "first-time" | "renewal";

// Mixing type
export type MixingType = "normal" | "dry";

// Report language type
export type ReportLanguage = "arabic" | "english" | "both";

// Accommodation type
export type AccommodationType = "station" | "center";

// Station model
export const stations = pgTable("stations", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  owner: text("owner").notNull(),
  taxNumber: text("tax_number").notNull(),
  address: text("address").notNull(),
  cityDistrict: text("city_district").notNull(),
  location: text("location"),
  distance: integer("distance").notNull(),
  approvalType: text("approval_type", { enum: ["first-time", "renewal"] }).notNull(),
  certificateExpiryDate: timestamp("certificate_expiry_date"),
  mixersCount: integer("mixers_count").notNull(),
  maxCapacity: integer("max_capacity").notNull(),
  mixingType: text("mixing_type", { enum: ["normal", "dry"] }).notNull(),
  reportLanguage: text("report_language", { enum: ["arabic", "english", "both"] }).notNull(),
  representativeName: text("representative_name").notNull(),
  representativePhone: text("representative_phone").notNull(),
  representativeId: text("representative_id").notNull(),
  qualityManagerName: text("quality_manager_name").notNull(),
  qualityManagerPhone: text("quality_manager_phone").notNull(),
  accommodation: text("accommodation", { enum: ["station", "center"] }),
  status: text("status", { 
    enum: ["pending-payment", "scheduled", "visited", "approved", "pending-documents"] 
  }).notNull().default("pending-payment"),
  fees: integer("fees").notNull(),
  requestDate: timestamp("request_date").defaultNow().notNull(),
  approvalStartDate: timestamp("approval_start_date"),
  approvalEndDate: timestamp("approval_end_date"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStationSchema = createInsertSchema(stations).omit({
  id: true,
  code: true, // Auto-generated
  status: true, // Default value
  requestDate: true, // Default value
  createdAt: true,
  updatedAt: true,
});

export type InsertStation = z.infer<typeof insertStationSchema>;
export type Station = typeof stations.$inferSelect;

// Payment model
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => stations.id),
  amount: integer("amount").notNull(),
  status: text("status", { enum: ["paid", "pending", "cancelled"] }).notNull().default("pending"),
  paymentMethod: text("payment_method", { enum: ["bank_transfer", "cash", "cheque"] }),
  invoiceNumber: text("invoice_number"),
  invoiceDate: timestamp("invoice_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Visit check item type
export type VisitCheckItem = 
  | "scale-calibration" 
  | "press-calibration" 
  | "uniformity-tests" 
  | "chloride-sulfate-tests" 
  | "water-chemical-tests" 
  | "7day-compression-strength" 
  | "28day-compression-strength";

// Visit type
export type VisitType = "first" | "second" | "additional";

// Visit model
export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => stations.id),
  visitType: text("visit_type", { enum: ["first", "second", "additional"] }).notNull(),
  visitDate: timestamp("visit_date").notNull(),
  visitTime: text("visit_time").notNull(),
  status: text("status", { enum: ["scheduled", "completed", "cancelled"] }).notNull().default("scheduled"),
  committee: jsonb("committee").notNull(), // Array of committee members {name, role}
  checks: jsonb("checks"), // Array of check results {itemId, status, notes}
  report: text("report"), // URL to report file
  certificateIssued: boolean("certificate_issued").default(false),
  certificateUrl: text("certificate_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVisitSchema = createInsertSchema(visits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visits.$inferSelect;

// Settings model for system configuration
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;
