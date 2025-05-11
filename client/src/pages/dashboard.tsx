import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import PageHeader from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Link } from "wouter";
import { 
  formatDate, 
  approvalTypeNames, 
  type ApprovalType, 
  type StationStatus,
  type UserRole
} from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

// أنواع مختلفة من الإحصائيات التي سيتم عرضها حسب دور المستخدم
const statsByRole: Record<UserRole, Array<{ title: string, icon: string, color: string, dataKey: string }>> = {
  admin: [
    { title: "إجمالي المحطات", icon: "business", color: "primary", dataKey: "totalStations" },
    { title: "طلبات قيد الانتظار", icon: "hourglass_top", color: "warning", dataKey: "pendingRequests" },
    { title: "زيارات هذا الأسبوع", icon: "event", color: "secondary", dataKey: "weekVisits" },
    { title: "شهادات تنتهي خلال شهر", icon: "warning", color: "destructive", dataKey: "expiringCertificates" },
  ],
  secretary: [
    { title: "إجمالي المحطات", icon: "business", color: "primary", dataKey: "totalStations" },
    { title: "طلبات قيد الانتظار", icon: "hourglass_top", color: "warning", dataKey: "pendingRequests" },
    { title: "بانتظار الدفع", icon: "payments", color: "destructive", dataKey: "pendingPayments" },
    { title: "شهادات تنتهي خلال شهر", icon: "warning", color: "destructive", dataKey: "expiringCertificates" },
  ],
  engineer: [
    { title: "زيارات هذا الأسبوع", icon: "event", color: "secondary", dataKey: "weekVisits" },
    { title: "زيارات تمت", icon: "check_circle", color: "success", dataKey: "completedVisits" },
    { title: "زيارات مجدولة", icon: "calendar_today", color: "primary", dataKey: "scheduledVisits" },
    { title: "محطات معتمدة", icon: "verified", color: "secondary", dataKey: "approvedStations" },
  ],
  client: [
    { title: "محطاتي", icon: "business", color: "primary", dataKey: "myStations" },
    { title: "محطات معتمدة", icon: "verified", color: "success", dataKey: "approvedStations" },
    { title: "محطات بانتظار الزيارة", icon: "schedule", color: "warning", dataKey: "pendingVisitStations" },
    { title: "محطات منتهية الاعتماد", icon: "warning", color: "destructive", dataKey: "expiredStations" },
  ],
};

// واجهة لبيانات محطة
interface Station {
  id: number;
  code: string;
  name: string;
  approvalType: ApprovalType;
  createdAt: string;
  status: StationStatus;
  userId: number;
  expiryDate?: string | null;
}

// واجهة لبيانات زيارة
interface Visit {
  id: number;
  stationId: number;
  stationName: string;
  scheduledDate: string;
  scheduledTime: string;
  status: "scheduled" | "completed" | "cancelled";
}

// واجهة للإحصائيات
interface DashboardStats {
  totalStations: number;
  pendingRequests: number;
  weekVisits: number;
  expiringCertificates: number;
  pendingPayments: number;
  completedVisits: number;
  scheduledVisits: number;
  approvedStations: number;
  myStations: number;
  pendingVisitStations: number;
  expiredStations: number;
}

// تنسيق التاريخ إلى صيغة نصية مناسبة
function formatVisitDate(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const visitDate = new Date(dateStr);
  visitDate.setHours(0, 0, 0, 0);
  
  if (visitDate.getTime() === today.getTime()) {
    return "اليوم";
  } else if (visitDate.getTime() === tomorrow.getTime()) {
    return "غداً";
  } else {
    return formatDate(dateStr);
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
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
  });
  
  // استعلام عن الإحصائيات
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: user?.role === "admin" || user?.role === "secretary" || user?.role === "engineer" || user?.role === "client",
  });
  
  // استعلام عن أحدث المحطات
  const { data: stationsData, isLoading: stationsLoading } = useQuery({
    queryKey: ["/api/dashboard/recent-stations"],
    enabled: user?.role === "admin" || user?.role === "secretary",
  });
  
  // استعلام عن الزيارات القادمة
  const { data: visitsData, isLoading: visitsLoading } = useQuery({
    queryKey: ["/api/dashboard/upcoming-visits"],
    enabled: user?.role === "admin" || user?.role === "secretary" || user?.role === "engineer",
  });
  
  // تحديث الإحصائيات عند تغير البيانات
  useEffect(() => {
    if (statsData) {
      setDashboardStats(statsData);
    }
  }, [statsData]);
  
  // إذا لم يكن المستخدم من الأدوار المحددة، فلا يسمح له بالوصول
  if (user?.role !== "admin" && user?.role !== "secretary" && user?.role !== "engineer" && user?.role !== "client") {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-grow p-6 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">غير مصرح بالوصول</h2>
              <p className="text-muted-foreground">ليس لديك صلاحية للوصول إلى لوحة المتابعة</p>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // الإحصائيات المناسبة لدور المستخدم
  const userRoleStats = statsByRole[user.role as UserRole] || statsByRole.client;
  
  // محطات المستخدم إذا كان عميل
  const userStations = user?.role === "client" ? [
    { title: "محطاتي", href: "/stations", icon: "list", description: "عرض جميع محطاتك" },
    { title: "طلب جديد", href: "/new-request", icon: "add_circle", description: "إنشاء طلب اعتماد جديد" },
    { title: "جدول الزيارات", href: "/visit-schedule", icon: "event", description: "عرض جدول الزيارات القادمة" },
    { title: "المدفوعات", href: "/payments", icon: "payments", description: "إدارة المدفوعات الخاصة بك" },
  ] : [];
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-grow p-6 overflow-auto">
        <PageHeader 
          title="لوحة المتابعة" 
          description="نظرة عامة على محطات الخلط والمهام"
        />
        
        {/* الإحصائيات العامة */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {userRoleStats.map((stat, index) => (
            <Card key={index} className="shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">{stat.title}</p>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <h3 className="text-2xl font-bold">{dashboardStats[stat.dataKey as keyof DashboardStats]}</h3>
                    )}
                  </div>
                  <div className={`bg-${stat.color}/10 p-3 rounded-full`}>
                    <span className={`material-icons text-${stat.color}`}>{stat.icon}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* محتوى خاص بالعميل */}
        {user?.role === "client" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {userStations.map((item, index) => (
              <Link key={index} href={item.href}>
                <Card className="shadow h-full transition-all hover:shadow-md hover:-translate-y-1">
                  <CardContent className="p-4 h-full flex flex-col">
                    <div className="bg-primary/10 p-3 rounded-full w-fit mb-3">
                      <span className="material-icons text-primary">{item.icon}</span>
                    </div>
                    <h3 className="text-lg font-medium mb-1">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
        
        {/* أحدث المحطات والزيارات القادمة (للمسؤول والسكرتير) */}
        {(user?.role === "admin" || user?.role === "secretary") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card className="shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-heading font-bold">أحدث طلبات الاعتماد</h2>
                    <Link href="/approval-requests" className="text-primary hover:text-primary-dark transition-colors text-sm flex items-center">
                      عرض الكل
                      <span className="material-icons text-sm mr-1">arrow_back</span>
                    </Link>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-muted border-b">
                          <th className="py-2 px-4 text-right">كود المحطة</th>
                          <th className="py-2 px-4 text-right">اسم المحطة</th>
                          <th className="py-2 px-4 text-right">نوع الاعتماد</th>
                          <th className="py-2 px-4 text-right">تاريخ الطلب</th>
                          <th className="py-2 px-4 text-right">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stationsLoading ? (
                          Array(4).fill(0).map((_, i) => (
                            <tr key={i}>
                              <td className="py-2 px-4"><Skeleton className="h-6 w-24" /></td>
                              <td className="py-2 px-4"><Skeleton className="h-6 w-32" /></td>
                              <td className="py-2 px-4"><Skeleton className="h-6 w-20" /></td>
                              <td className="py-2 px-4"><Skeleton className="h-6 w-24" /></td>
                              <td className="py-2 px-4"><Skeleton className="h-6 w-20" /></td>
                            </tr>
                          ))
                        ) : stationsData && stationsData.length > 0 ? (
                          stationsData.map((station: Station) => (
                            <tr key={station.id} className="border-b hover:bg-muted/50 transition-colors">
                              <td className="py-2 px-4">
                                <Link href={`/station/${station.id}`} className="text-primary hover:underline">
                                  {station.code}
                                </Link>
                              </td>
                              <td className="py-2 px-4">{station.name}</td>
                              <td className="py-2 px-4">{approvalTypeNames[station.approvalType]}</td>
                              <td className="py-2 px-4">{formatDate(station.createdAt)}</td>
                              <td className="py-2 px-4">
                                <StatusBadge status={station.status} />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-4 text-center">لا توجد محطات لعرضها</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card className="shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-heading font-bold">الزيارات القادمة</h2>
                    <Link href="/visit-schedule" className="text-primary hover:text-primary-dark transition-colors text-sm flex items-center">
                      عرض الكل
                      <span className="material-icons text-sm mr-1">arrow_back</span>
                    </Link>
                  </div>
                  
                  {visitsLoading ? (
                    <div className="space-y-4">
                      {Array(4).fill(0).map((_, i) => (
                        <div key={i} className="border-r-4 border-primary-light pr-4">
                          <Skeleton className="h-4 w-16 mb-1" />
                          <Skeleton className="h-6 w-40 mb-1" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      ))}
                    </div>
                  ) : visitsData && visitsData.length > 0 ? (
                    <ul className="space-y-4">
                      {visitsData.map((visit: Visit) => (
                        <li key={visit.id} className="border-r-4 border-primary-light pr-4">
                          <p className="text-muted-foreground text-xs">{formatVisitDate(visit.scheduledDate)}</p>
                          <p className="font-medium">{visit.stationName}</p>
                          <div className="flex items-center mt-1">
                            <span className="material-icons text-sm text-primary ml-1">schedule</span>
                            <span className="text-sm">{visit.scheduledTime}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground mb-2">لا توجد زيارات مجدولة</p>
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/visit-schedule">جدولة زيارة جديدة</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {/* الزيارات القادمة (للمهندس) */}
        {user?.role === "engineer" && (
          <div className="grid grid-cols-1 gap-4">
            <Card className="shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-heading font-bold">الزيارات المجدولة لك</h2>
                  <Link href="/visit-schedule" className="text-primary hover:text-primary-dark transition-colors text-sm flex items-center">
                    عرض الكل
                    <span className="material-icons text-sm mr-1">arrow_back</span>
                  </Link>
                </div>
                
                {visitsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array(6).fill(0).map((_, i) => (
                      <div key={i} className="border rounded-md p-4">
                        <Skeleton className="h-4 w-16 mb-1" />
                        <Skeleton className="h-6 w-40 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ))}
                  </div>
                ) : visitsData && visitsData.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visitsData.map((visit: Visit) => (
                      <div key={visit.id} className="border rounded-md p-4 hover:bg-muted/50 transition-colors">
                        <p className="text-muted-foreground text-xs mb-1">{formatVisitDate(visit.scheduledDate)} - {visit.scheduledTime}</p>
                        <p className="font-medium text-primary">{visit.stationName}</p>
                        <div className="flex justify-end mt-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/station/${visit.stationId}`}>تفاصيل المحطة</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-2">لا توجد زيارات مجدولة لك حالياً</p>
                    <p className="text-sm">يتم جدولة الزيارات بواسطة المسؤول أو السكرتير</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
