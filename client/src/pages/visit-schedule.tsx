import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import PageHeader from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { VisitCheckItem } from "@/lib/utils";
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { arEG } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Visit {
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

const locales = {
  'ar-EG': arEG,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 6 }), // السبت
  getDay,
  locales,
});

export default function VisitSchedulePage() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [modalVisit, setModalVisit] = useState<Visit | null>(null);
  
  // Fetch visit schedule data
  const { data: visitSchedule = [], isLoading } = useQuery<Visit[]>({
    queryKey: ["/api/visits"],
    enabled: user?.role === "admin" || user?.role === "secretary" || user?.role === "engineer",
  });
  
  useEffect(() => {
    fetchVisits();
  }, []);

  useEffect(() => {
    console.log('visits:', visits);
  }, [visits]);

  const fetchVisits = async () => {
    try {
      const response = await fetch("/api/visits");
      if (!response.ok) {
        throw new Error("Failed to fetch visits");
      }
      const data = await response.json();
      setVisits(data);
    } catch (error) {
      console.error("Error fetching visits:", error);
      toast.error("حدث خطأ أثناء جلب بيانات الزيارات");
    }
  };

  const handleChecksComplete = async (checks: Array<{ itemId: VisitCheckItem; status: boolean; notes: string }>) => {
    // Refresh visits after checks are completed
    await fetchVisits();
    setSelectedVisit(null);
  };
  
  // Only admin, secretary, and engineer can access this page
  if (user?.role !== "admin" && user?.role !== "secretary" && user?.role !== "engineer") {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-grow p-6 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">غير مصرح بالوصول</h2>
              <p className="text-muted-foreground">ليس لديك صلاحية للوصول إلى جدول الزيارات</p>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // تحويل الزيارات إلى أحداث الكالندر مع معالجة التاريخ والوقت بشكل صحيح
  let events: Array<{
    id: number;
    title: string;
    start: Date;
    end: Date;
    resource: Visit;
  }> = visits.map((visit: Visit) => {
    const start = new Date(visit.visitDate);
    const end = new Date(visit.visitDate);
    return {
      id: visit.id,
      title: `${visit.stationName} (${visit.visitType === 'first' ? 'الزيارة الأولى' : visit.visitType === 'second' ? 'الزيارة الثانية' : 'زيارة إضافية'})`,
      start,
      end,
      resource: visit,
    };
  });

  useEffect(() => {
    console.log('events:', events);
    events.forEach(e => console.log(e.title, e.start, e.end));
  }, [events]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ar-EG");
  };
  
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const suffix = hour >= 12 ? "مساءً" : "صباحاً";
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${suffix}`;
  };
  
  const getStatusDisplay = (status: string) => {
    switch(status) {
      case 'scheduled':
        return 'مجدول';
      case 'completed':
        return 'مكتمل';
      case 'cancelled':
        return 'ملغي';
      default:
        return status;
    }
  };
  
  const getVisitTypeDisplay = (type: string) => {
    switch(type) {
      case 'first':
        return 'الزيارة الأولى';
      case 'second':
        return 'الزيارة الثانية';
      case 'additional':
        return 'زيارة إضافية';
      default:
        return type;
    }
  };

  const isTodayOrPast = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    return date <= today;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-grow p-6 overflow-auto">
        <PageHeader 
          title="جدول الزيارات" 
          description="عرض زيارات محطات الخلط في شكل تقويم"
        />
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Skeleton className="h-8 w-32" />
          </div>
        ) : (
          <div className="bg-white rounded shadow p-4">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600, fontFamily: 'Cairo, Tahoma, Arial, sans-serif', direction: 'rtl', background: '#f9fafb', borderRadius: '12px', boxShadow: '0 2px 8px #0001' }}
              popup
              messages={{
                next: 'التالي',
                previous: 'السابق',
                today: 'اليوم',
                month: 'شهر',
                week: 'أسبوع',
                day: 'يوم',
                agenda: 'جدول',
                date: 'التاريخ',
                time: 'الوقت',
                event: 'الزيارة',
                showMore: (total: number) => `+${total} زيارات أخرى`,
              }}
              onSelectEvent={(event: { resource: Visit }) => setModalVisit(event.resource)}
              culture="ar-EG"
              eventPropGetter={(): { style: React.CSSProperties } => ({
                style: {
                  backgroundColor: '#2563eb',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  padding: '4px 8px',
                  textAlign: 'right',
                  direction: 'rtl',
                  boxShadow: '0 1px 4px #0002',
                }
              })}
            />
          </div>
        )}
        {/* Modal لعرض تفاصيل الزيارة */}
        <Dialog open={!!modalVisit} onOpenChange={() => setModalVisit(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تفاصيل الزيارة</DialogTitle>
            </DialogHeader>
            {modalVisit && (
              <div className="space-y-3">
                <div>
                  <span className="font-bold">المحطة:</span> {modalVisit.stationName}
                </div>
                <div>
                  <span className="font-bold">الكود:</span> {modalVisit.stationCode}
                </div>
                <div>
                  <span className="font-bold">نوع الزيارة:</span> {getVisitTypeDisplay(modalVisit.visitType)}
                </div>
                <div>
                  <span className="font-bold">التاريخ:</span> {formatDate(modalVisit.visitDate)}
                </div>
                <div>
                  <span className="font-bold">الوقت:</span> {formatTime(modalVisit.visitTime)}
                </div>
                <div>
                  <span className="font-bold">الحالة:</span> {getStatusDisplay(modalVisit.status)}
                </div>
                <div>
                  <span className="font-bold">اللجنة:</span>
                  <ul className="list-disc pl-4">
                    {modalVisit.committee.map((member, idx) => (
                      <li key={idx}>{member.name} - {member.role}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
