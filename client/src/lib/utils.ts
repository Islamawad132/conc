import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type UserRole = "admin" | "secretary" | "engineer" | "client" | "chairman";

export const roleNames: Record<UserRole, string> = {
  admin: "مسؤول النظام",
  secretary: "سكرتير",
  engineer: "مهندس",
  client: "عميل",
  chairman: "رئيس لجنة"
};

export type ApprovalType = "first-time" | "renewal";

export const approvalTypeNames: Record<ApprovalType, string> = {
  "first-time": "اعتماد أول مرة",
  "renewal": "تجديد اعتماد",
};

export type MixingType = "normal" | "dry";

export const mixingTypeNames: Record<MixingType, string> = {
  normal: "عادي",
  dry: "جاف",
};

export type ReportLanguage = "arabic" | "english" | "both";

export const reportLanguageNames: Record<ReportLanguage, string> = {
  arabic: "عربي",
  english: "إنجليزي",
  both: "عربي وإنجليزي",
};

export type AccommodationType = "station" | "center";

export const accommodationTypeNames: Record<AccommodationType, string> = {
  station: "المحطة",
  center: "المركز",
};

export type StationStatus = 
  | "pending-payment"
  | "payment-confirmed"
  | "committee-assigned"
  | "scheduled" 
  | "visited" 
  | "approved" 
  | "pending-documents"
  | "تحت الإختبار"
  | "هناك فشل في بعض التجارب"
  | "يمكن للمحطة استخراج خطاب تشغيل"
  | "تم اعتماد المحطة"
  | "جاري العمل على الإختبارات";

export const stationStatusNames: Record<StationStatus, string> = {
  "pending-payment": "بانتظار الدفع",
  "payment-confirmed": "تم الموافقة على الطلب",
  "committee-assigned": "تم تعيين اللجنة",
  "scheduled": "تمت جدولة الزيارة",
  "visited": "تمت الزيارة",
  "approved": "معتمد",
  "pending-documents": "بانتظار المستندات",
  "تحت الإختبار": "تحت الإختبار",
  "هناك فشل في بعض التجارب": "هناك فشل في بعض التجارب",
  "يمكن للمحطة استخراج خطاب تشغيل": "يمكن للمحطة استخراج خطاب تشغيل",
  "تم اعتماد المحطة": "تم اعتماد المحطة",
  "جاري العمل على الإختبارات": "جاري العمل على الإختبارات"
};

export const stationStatusColors: Record<StationStatus, string> = {
  "pending-payment": "warning",
  "payment-confirmed": "info",
  "committee-assigned": "primary",
  "scheduled": "primary",
  "visited": "secondary",
  "approved": "success",
  "pending-documents": "destructive",
  "تحت الإختبار": "info",
  "هناك فشل في بعض التجارب": "destructive",
  "يمكن للمحطة استخراج خطاب تشغيل": "success",
  "تم اعتماد المحطة": "success",
  "جاري العمل على الإختبارات": "info"
};

export type VisitCheckItem = 
  | "scale-calibration" 
  | "press-calibration" 
  | "uniformity-tests" 
  | "chloride-sulfate-tests" 
  | "water-chemical-tests" 
  | "7day-compression-strength" 
  | "28day-compression-strength";

export const visitCheckItemNames: Record<VisitCheckItem, string> = {
  "scale-calibration": "الانتهاء من معايرة الموازين",
  "press-calibration": "الانتهاء من معايرة ماكينة اختبار الضغط",
  "uniformity-tests": "الانتهاء من اختبارات التجانس",
  "chloride-sulfate-tests": "اختبارات محتوى الكلوريدات والكبريتات تفي بحدود الكود المصري",
  "water-chemical-tests": "الاختبارات الكيميائية للماء تفي بحدود الكود المصري",
  "7day-compression-strength": "مقاومة الضغط الخرسانة عند عمر 7 أيام تفي بالمقاومة المطلوبة",
  "28day-compression-strength": "مقاومة الضغط الخرسانة عند عمر 28 أيام تفي بالمقاومة المطلوبة",
};

export function formatDate(date: Date | string): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("ar-EG");
}

export function generateStationCode(year: number, serial: number): string {
  return `BMI/RM/${year}/${serial}`;
}

export function calculateFees(
  distance: number,
  mixersCount: number,
  reportLanguage: ReportLanguage,
  accommodation: AccommodationType | null = null
): {
  distanceCost: number;
  mixersCost: number;
  accommodationCost: number;
  additionalReportCost: number;
  taxCost: number;
  totalCost: number;
} {
  // Price constants
  const DISTANCE_RATE = 15; // EGP per km
  const MIXER_RATE = 1000; // EGP per mixer
  const ACCOMMODATION_COST = 1000; // EGP if center provides accommodation
  const ADDITIONAL_REPORT_RATE = 0.05; // 5% additional for extra language report
  const TAX_RATE = 0.14; // 14% tax
  
  // Calculate costs
  const distanceCost = distance * DISTANCE_RATE;
  const mixersCost = mixersCount * MIXER_RATE;
  
  // Additional costs based on conditions
  let accommodationCost = 0;
  if (distance > 200 && accommodation === "center") {
    accommodationCost = ACCOMMODATION_COST;
  }
  
  let additionalReportCost = 0;
  if (reportLanguage === "both") {
    additionalReportCost = (distanceCost + mixersCost + accommodationCost) * ADDITIONAL_REPORT_RATE;
  }
  
  const subtotal = distanceCost + mixersCost + accommodationCost + additionalReportCost;
  const taxCost = subtotal * TAX_RATE;
  const totalCost = subtotal + taxCost;
  
  return {
    distanceCost,
    mixersCost,
    accommodationCost,
    additionalReportCost,
    taxCost,
    totalCost,
  };
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("ar-EG") + " جنيه";
}
