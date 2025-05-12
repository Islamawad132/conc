import { VisitCheckItem } from "./utils";

export interface Visit {
  id: number;
  stationId: number;
  stationName: string;
  stationCode: string;
  visitType: "first" | "second" | "additional";
  visitDate: string;
  visitTime: string;
  status: "scheduled" | "completed" | "cancelled";
  committee: Array<{ name: string; role: string }>;
  checks: Array<{ itemId: VisitCheckItem; status: boolean; notes: string }> | null;
  report: string | null;
  certificateIssued: boolean;
  certificateUrl: string | null;
  createdAt: string;
  updatedAt: string;
} 