import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import PageHeader from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";

// Mock data for demonstration purposes
const visitSchedule = [
  {
    id: "v1",
    stationId: "140",
    stationName: "محطة المنصورة للخلط",
    stationCode: "BMI/RM/2023/140",
    date: "2023-06-17",
    time: "10:00",
    status: "today",
    visitType: "first",
    committee: [
      { name: "د. عبد الرحمن محمود", role: "رئيس اللجنة" },
      { name: "م. سمير عبد الله", role: "المهندس" },
      { name: "أ. محمد أحمد", role: "السكرتير" },
    ]
  },
  {
    id: "v2",
    stationId: "141",
    stationName: "محطة القاهرة الجديدة",
    stationCode: "BMI/RM/2023/141",
    date: "2023-06-18",
    time: "11:30",
    status: "tomorrow",
    visitType: "first",
    committee: [
      { name: "د. عبد الرحمن محمود", role: "رئيس اللجنة" },
      { name: "م. سمير عبد الله", role: "المهندس" },
      { name: "أ. محمد أحمد", role: "السكرتير" },
    ]
  },
  {
    id: "v3",
    stationId: "142",
    stationName: "محطة الإسكندرية للخرسانة",
    stationCode: "BMI/RM/2023/142",
    date: "2023-06-18",
    time: "09:00",
    status: "upcoming",
    visitType: "first",
    committee: [
      { name: "د. سليمان عمر", role: "رئيس اللجنة" },
      { name: "م. خالد محمود", role: "المهندس" },
      { name: "أ. أحمد علي", role: "السكرتير" },
    ]
  },
  {
    id: "v4",
    stationId: "139",
    stationName: "محطة أسيوط للخرسانة",
    stationCode: "BMI/RM/2023/139",
    date: "2023-06-20",
    time: "13:00",
    status: "upcoming",
    visitType: "second",
    committee: [
      { name: "د. فاطمة الزهراء", role: "رئيس اللجنة" },
      { name: "م. مصطفى السيد", role: "المهندس" },
      { name: "أ. عمر أحمد", role: "السكرتير" },
    ]
  },
];

export default function VisitSchedulePage() {
  const { user } = useAuth();
  const [isLoading] = useState(false);
  
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
      case 'today':
        return 'اليوم';
      case 'tomorrow':
        return 'غداً';
      case 'upcoming':
        return formatDate(visitSchedule.find(v => v.status === status)?.date || '');
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
  
  // Group visits by date status (today, tomorrow, upcoming)
  const groupedVisits = visitSchedule.reduce((acc, visit) => {
    if (!acc[visit.status]) {
      acc[visit.status] = [];
    }
    acc[visit.status].push(visit);
    return acc;
  }, {} as Record<string, typeof visitSchedule>);
  
  // Order: today, tomorrow, upcoming
  const orderedKeys = ['today', 'tomorrow', 'upcoming'];
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-grow p-6 overflow-auto">
        <PageHeader 
          title="جدول الزيارات" 
          description="عرض وإدارة جدول زيارات محطات الخلط"
        />
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <p>جاري تحميل البيانات...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orderedKeys.map(statusKey => 
              groupedVisits[statusKey] && (
                <div key={statusKey}>
                  <h2 className="text-xl font-heading font-bold mb-4">
                    {getStatusDisplay(statusKey)}
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedVisits[statusKey].map(visit => (
                      <Card key={visit.id} className="shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <Link href={`/station/${visit.stationId}`}>
                              <h3 className="font-heading font-bold text-lg text-primary hover:underline cursor-pointer">
                                {visit.stationName}
                              </h3>
                            </Link>
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                              {getVisitTypeDisplay(visit.visitType)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-4">
                            كود المحطة: {visit.stationCode}
                          </p>
                          
                          <div className="flex items-center mb-4">
                            <span className="material-icons text-sm text-primary ml-1">schedule</span>
                            <span className="text-sm">{formatTime(visit.time)}</span>
                          </div>
                          
                          <div className="border-t pt-3 mt-2">
                            <p className="text-sm font-medium mb-2">اللجنة المسؤولة:</p>
                            <ul className="space-y-1 text-sm">
                              {visit.committee.map((member, idx) => (
                                <li key={idx}>
                                  <span className="font-medium">{member.name}</span>
                                  <span className="text-muted-foreground"> - {member.role}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            )}
            
            {Object.keys(groupedVisits).length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">لا توجد زيارات مجدولة</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
