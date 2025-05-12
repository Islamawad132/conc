import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import PageHeader from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";
import { PaymentConfirmationModal } from "@/components/modals/payment-confirmation";
import { CommitteeAssignmentModal } from "@/components/modals/committee-assignment";
import { useState, useEffect } from "react";
import { VisitScheduleModal } from "@/components/modals/visit-schedule";
import { toast } from "sonner";
import { VisitChecks } from "@/components/visit-checks";

interface Station {
  id: number;
  code: string;
  name: string;
  owner: string;
  taxNumber: string;
  address: string;
  cityDistrict: string;
  location: string;
  distance: number;
  approvalType: "first-time" | "renewal";
  certificateExpiryDate: string | null;
  mixersCount: number;
  maxCapacity: number;
  mixingType: "normal" | "dry";
  reportLanguage: "arabic" | "english" | "both";
  accommodation: "station" | "center" | null;
  representativeName: string;
  representativePhone: string;
  representativeId: string;
  qualityManagerName: string;
  qualityManagerPhone: string;
  status: "pending-payment" | "payment-confirmed" | "committee-assigned" | "scheduled" | "visited" | "approved" | "pending-documents";
  fees: number;
  requestDate: string;
  approvalStartDate: string | null;
  approvalEndDate: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  paymentReference?: string;
  paymentDate?: string;
  committee?: Array<{ name: string; role: string }>;
}

interface Visit {
  id: number;
  stationId: number;
  visitType: "first" | "second" | "additional";
  visitDate: string;
  visitTime: string;
  status: "scheduled" | "completed" | "cancelled";
  committee: Array<{ name: string; role: string }>;
  checks: Array<{ itemId: string; status: boolean; notes: string }> | null;
  report: string | null;
  certificateIssued: boolean;
  certificateUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function StationDetailsPage() {
  const { id } = useParams();
  const stationId = parseInt(id || "0");
  const [station, setStation] = useState<Station | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const { user } = useAuth();

  const fetchStation = async () => {
    if (!stationId) return;
    
    try {
      const response = await fetch(`/api/stations/${stationId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch station");
      }
      const data = await response.json();
      setStation(data);
    } catch (error) {
      console.error("Error fetching station:", error);
      toast.error("حدث خطأ أثناء جلب بيانات المحطة");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStation();
  }, [stationId]);

  // Fetch station visits
  const { data: visits = [], isLoading: isVisitsLoading } = useQuery<Visit[]>({
    queryKey: [`/api/stations/${stationId}/visits`],
    enabled: !!stationId,
  });

  const isLoadingVisits = isVisitsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-grow p-6 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p>جاري تحميل البيانات...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-grow p-6 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">المحطة غير موجودة</h2>
              <p className="text-muted-foreground">لم يتم العثور على المحطة المطلوبة</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Get first and second visits
  const firstVisit = visits.find(v => v.visitType === "first");
  const secondVisit = visits.find(v => v.visitType === "second");

  // Helper: is visit scheduled for today or past
  const isTodayOrPast = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    return date <= today;
  };

  const handleChecksComplete = async () => {
    // Refetch visits after checks are completed
    await fetchStation();
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-grow p-6 overflow-auto">
        <PageHeader 
          title={station.name} 
          description={`كود المحطة: ${station.code}`}
          actions={
            user?.role === "secretary" && (
              <div>
                <Button variant="outline" className="ml-2">
                  <span className="material-icons ml-1 align-middle">print</span>
                  طباعة البيانات
                </Button>
                <Button>
                  <span className="material-icons ml-1 align-middle">edit</span>
                  تعديل البيانات
                </Button>
              </div>
            )
          }
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Station Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Info */}
            <Card className="shadow">
              <CardContent className="p-6">
                <h2 className="text-xl font-heading font-bold mb-4 pb-2 border-b">البيانات العامة</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm">اسم المحطة</p>
                    <p className="font-medium">{station.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">الجهة المالكة للمحطة</p>
                    <p className="font-medium">{station.owner}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">الرقم الضريبي</p>
                    <p className="font-medium">{station.taxNumber}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">عنوان المحطة</p>
                    <p className="font-medium">{station.address}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">جهاز المدينة/الحي</p>
                    <p className="font-medium">{station.cityDistrict}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">المسافة بين المحطة والمركز (كم)</p>
                    <p className="font-medium">{station.distance}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">نوع الاعتماد</p>
                    <p className="font-medium">
                      {station.approvalType === "first-time" ? "اعتماد أول مرة" : "تجديد اعتماد"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Station Technical Info */}
            <Card className="shadow">
              <CardContent className="p-6">
                <h2 className="text-xl font-heading font-bold mb-4 pb-2 border-b">البيانات الفنية للمحطة</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm">عدد الخلاطات</p>
                    <p className="font-medium">{station.mixersCount}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">أقصى سعة للخلاطة</p>
                    <p className="font-medium">{station.maxCapacity} م³</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">نوع الخلط</p>
                    <p className="font-medium">
                      {station.mixingType === "normal" ? "عادي" : "جاف"}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">لغة التقرير</p>
                    <p className="font-medium">
                      {station.reportLanguage === "arabic" ? "عربي" : 
                       station.reportLanguage === "english" ? "إنجليزي" : 
                       "عربي وإنجليزي"}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">توفير الإقامة أثناء الزيارات</p>
                    <p className="font-medium">
                      {station.accommodation === "station" ? "المحطة" :
                       station.accommodation === "center" ? "المركز" :
                       "غير محدد"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Contact Info */}
            <Card className="shadow">
              <CardContent className="p-6">
                <h2 className="text-xl font-heading font-bold mb-4 pb-2 border-b">بيانات التواصل</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm">اسم المندوب</p>
                    <p className="font-medium">{station.representativeName}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">رقم تليفون المندوب</p>
                    <p className="font-medium">{station.representativePhone}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">الرقم القومي للمندوب</p>
                    <p className="font-medium">{station.representativeId}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">اسم مدير الجودة بالمحطة</p>
                    <p className="font-medium">{station.qualityManagerName}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">رقم تليفون مدير الجودة</p>
                    <p className="font-medium">{station.qualityManagerPhone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Visit Reports */}
            <Card className="shadow">
              <CardContent className="p-6">
                <h2 className="text-xl font-heading font-bold mb-4 pb-2 border-b">تقارير الزيارات</h2>
                
                {firstVisit && (
                  <div className="mb-6">
                    <h3 className="font-bold mb-2">الزيارة الأولى</h3>
                    <p className="text-muted-foreground text-sm mb-2">تاريخ الزيارة: {formatDate(firstVisit.visitDate)}</p>
                    
                    {firstVisit.checks && (
                      <div className="bg-muted p-4 rounded-lg mb-4">
                        <ul className="space-y-3">
                          {firstVisit.checks.map((check) => (
                            <li key={check.itemId} className="flex items-center">
                              <span className={`material-icons ml-2 ${check.status ? 'text-success' : 'text-destructive'}`}>
                                {check.status ? 'check_circle' : 'cancel'}
                              </span>
                              <span>{check.notes}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {firstVisit.status === "scheduled" && isTodayOrPast(firstVisit.visitDate) && ["admin","secretary","engineer"].includes(user?.role ?? "") && (
                      <div className="mt-4">
                        <VisitChecks
                          visitId={firstVisit.id}
                          stationId={firstVisit.stationId}
                          visitType={firstVisit.visitType}
                          initialChecks={
                            (firstVisit.checks || []).map(c => ({
                              ...c,
                              itemId: c.itemId as import("@/lib/utils").VisitCheckItem,
                              status:
                                typeof c.status === "string"
                                  ? c.status
                                  : c.status === true
                                  ? "passed"
                                  : c.status === false
                                  ? "failed"
                                  : "pending"
                            }))
                          }
                          onChecksComplete={handleChecksComplete}
                        />
                      </div>
                    )}
                    
                    {firstVisit.report && (
                      <div className="flex">
                        <Button variant="link" className="text-primary p-0 h-auto">
                          <span className="material-icons ml-1 text-sm">description</span>
                          محضر الزيارة الأولى
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                {secondVisit && (
                  <div>
                    <h3 className="font-bold mb-2">الزيارة الثانية</h3>
                    <p className="text-muted-foreground text-sm mb-2">
                      تاريخ الزيارة: {formatDate(secondVisit.visitDate)}
                      {secondVisit.status === "scheduled" && " (مجدولة)"}
                    </p>
                    
                    {secondVisit.status === "scheduled" && isTodayOrPast(secondVisit.visitDate) && ["admin","secretary","engineer"].includes(user?.role ?? "") && (
                      <div className="mt-4">
                        <VisitChecks
                          visitId={secondVisit.id}
                          stationId={secondVisit.stationId}
                          visitType={secondVisit.visitType}
                          initialChecks={
                            (secondVisit.checks || []).map(c => ({
                              ...c,
                              itemId: c.itemId as import("@/lib/utils").VisitCheckItem,
                              status:
                                typeof c.status === "string"
                                  ? c.status
                                  : c.status === true
                                  ? "passed"
                                  : c.status === false
                                  ? "failed"
                                  : "pending"
                            }))
                          }
                          onChecksComplete={handleChecksComplete}
                        />
                      </div>
                    )}
                    
                    {secondVisit.status === "scheduled" && (
                      <div className="flex">
                        <span className="px-3 py-1 rounded-full bg-primary bg-opacity-10 text-primary text-sm">
                          بانتظار الزيارة
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Status Info */}
            <Card className="shadow">
              <CardContent className="p-6">
                <h2 className="text-xl font-heading font-bold mb-4 pb-2 border-b">حالة الاعتماد</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-muted-foreground text-sm">الحالة الحالية</p>
                    <div className="mt-1">
                      <StatusBadge status={station.status} />
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">تاريخ استلام الطلب</p>
                    <p className="font-medium">{formatDate(station.requestDate)}</p>
                  </div>
                  
                  {station.approvalStartDate && (
                    <div>
                      <p className="text-muted-foreground text-sm">تاريخ بداية الاعتماد</p>
                      <p className="font-medium">{formatDate(station.approvalStartDate)}</p>
                    </div>
                  )}
                  
                  {station.approvalEndDate && (
                    <div>
                      <p className="text-muted-foreground text-sm">تاريخ نهاية الاعتماد</p>
                      <p className="font-medium">{formatDate(station.approvalEndDate)}</p>
                    </div>
                  )}
                  
                  {["secretary", "admin"].includes(user?.role ?? "") && (
                    <div className="space-y-2">
                      {station.status === "pending-payment" && (
                        <Button 
                          className="w-full" 
                          onClick={() => setIsPaymentModalOpen(true)}
                        >
                          تقديم إثبات الدفع
                        </Button>
                      )}
                      {station.status === "payment-confirmed" && (
                        <Button 
                          className="w-full" 
                          onClick={() => setIsCommitteeModalOpen(true)}
                        >
                          تعيين اللجنة
                        </Button>
                      )}
                      {station.status === "committee-assigned" && (
                        <Button 
                          className="w-full" 
                          onClick={() => setIsVisitModalOpen(true)}
                        >
                          إنشاء زيارة
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Payment Info */}
            <Card className="shadow">
              <CardContent className="p-6">
                <h2 className="text-xl font-heading font-bold mb-4 pb-2 border-b">بيانات الدفع</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-muted-foreground text-sm">إجمالي الرسوم</p>
                    <p className="font-medium">{station.fees.toLocaleString()} جنيه</p>
                  </div>
                  
                  {station.paymentReference && (
                    <>
                      <div>
                        <p className="text-muted-foreground text-sm">رقم خطاب الوارد</p>
                        <p className="font-medium">{station.paymentReference}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">تاريخ توريد الخطاب</p>
                        <p className="font-medium">{station.paymentDate ? formatDate(station.paymentDate) : "—"}</p>
                      </div>
                    </>
                  )}
                  
                  {user?.role === "secretary" && station.status === "pending-payment" && (
                    <Button 
                      className="w-full mt-2" 
                      variant="outline"
                      onClick={() => setIsPaymentModalOpen(true)}
                    >
                      تأكيد الدفع
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Modals */}
      <PaymentConfirmationModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        stationId={stationId}
      />
      
      <CommitteeAssignmentModal
        isOpen={isCommitteeModalOpen}
        onClose={() => setIsCommitteeModalOpen(false)}
        stationId={stationId}
      />
      
      <VisitScheduleModal
        isOpen={isVisitModalOpen}
        onClose={() => setIsVisitModalOpen(false)}
        stationId={station.id}
        onSuccess={() => {
          // Refresh station data
          fetchStation();
        }}
      />
    </div>
  );
}
