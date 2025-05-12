import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import PageHeader from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { formatDate, VisitCheckItem, visitCheckItemNames } from "@/lib/utils";
import { PaymentConfirmationModal } from "@/components/modals/payment-confirmation";
import { CommitteeAssignmentModal } from "@/components/modals/committee-assignment";
import { useState, useEffect } from "react";
import { VisitScheduleModal } from "@/components/modals/visit-schedule";
import { toast } from "sonner";
import { VisitChecks } from "@/components/visit-checks";
import { Badge } from "@/components/ui/badge";

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
  status: "pending-payment" | "payment-confirmed" | "committee-assigned" | "scheduled" | "visited" | "approved" | "pending-documents" | "تحت الإختبار" | "هناك فشل في بعض التجارب" | "يمكن للمحطة استخراج خطاب تشغيل" | "تم اعتماد المحطة" | "جاري العمل على الإختبارات";
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
  allowAdditionalVisit?: boolean;
}

interface VisitCheck {
  itemId: VisitCheckItem;
  status: 'passed' | 'failed' | 'pending';
  notes: string;
}

interface Visit {
  id: number;
  stationId: number;
  visitType: "first" | "second" | "additional";
  visitDate: string;
  visitTime: string;
  status: "scheduled" | "completed" | "cancelled" | "visited";
  committee: Array<{ name: string; role: string }>;
  checks: VisitCheck[] | null;
  report: string | null;
  certificateIssued: boolean;
  certificateUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function StationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const stationId = parseInt(id || "0");
  const { user } = useAuth();
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [showCommitteeAssignment, setShowCommitteeAssignment] = useState(false);
  const [showVisitSchedule, setShowVisitSchedule] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);

  const { data: station, isLoading } = useQuery<Station>({
    queryKey: [`/api/stations/${stationId}`],
    enabled: !!stationId
  });

  const fetchVisits = async () => {
    try {
      const response = await fetch(`/api/stations/${id}/visits`);
      if (!response.ok) throw new Error("Failed to fetch visits");
      const data = await response.json();
      setVisits(data);
    } catch (error) {
      console.error("Error fetching visits:", error);
      toast.error("حدث خطأ أثناء جلب بيانات الزيارات");
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [id]);

  const handleChecksComplete = async () => {
    await fetchVisits();
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("ar-EG");
  };

  const getVisitByType = (type: "first" | "second" | "additional") => {
    return visits.find(v => v.visitType === type);
  };

  const getVisitNumber = (visit: Visit): number => {
    if (visit.visitType !== 'additional') return 1;
    const additionalVisits = visits
      .filter(v => v.visitType === 'additional')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return additionalVisits.findIndex(v => v.id === visit.id) + 2;
  };

  const getFailedChecks = (visits: Visit[]): VisitCheckItem[] => {
    // Sort visits by creation date in descending order (newest first)
    const sortedVisits = [...visits].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Find the most recent completed visit
    const lastCompletedVisit = sortedVisits.find(v => isVisitCompleted(v.status));
    
    if (!lastCompletedVisit || !lastCompletedVisit.checks) return [];

    // Return the failed checks from the most recent completed visit
    return lastCompletedVisit.checks
      .filter(c => c.status === 'failed')
      .map(c => c.itemId);
  };

  const hasIncompleteAdditionalVisit = visits.some(
    v => v.visitType === 'additional' && (!v.checks || v.checks.some(c => c.status === 'pending'))
  );

  const shouldShowAdditionalVisitButton = 
    (user?.role === "secretary" || user?.role === "admin") && 
    station?.allowAdditionalVisit && 
    !hasIncompleteAdditionalVisit &&
    (station.status === "هناك فشل في بعض التجارب" || station.status === "جاري العمل على الإختبارات" || station.status === "يمكن للمحطة استخراج خطاب تشغيل");

  const isVisitCompleted = (status: Visit['status']): boolean => {
    return status === 'completed' || status === 'visited';
  };

  const renderVisitResults = (visit: Visit) => {
    if (!visit.checks) return null;

    // For additional visits, only show failed tests if the visit is not completed
    const checksToShow = visit.visitType === 'additional' && !isVisitCompleted(visit.status)
      ? visit.checks.filter(check => getFailedChecks(visits).includes(check.itemId))
      : visit.checks;

    if (checksToShow.length === 0) return null;

    return (
      <div className="bg-muted p-4 rounded-lg mb-4">
        <h4 className="font-semibold mb-2">
          نتائج الاختبارات
          {visit.visitType === 'additional' && !isVisitCompleted(visit.status) && ' (الاختبارات الفاشلة فقط)'}:
        </h4>
        <ul className="space-y-2">
          {checksToShow.map((check) => {
            const status = typeof check.status === 'string' 
              ? check.status === 'passed'
              : check.status;
            return (
              <li key={check.itemId} className="flex items-center">
                <span className={`material-icons ml-2 ${status ? 'text-success' : 'text-destructive'}`}>
                  {status ? 'check_circle' : 'cancel'}
                </span>
                <span>{visitCheckItemNames[check.itemId]}</span>
                {check.notes && (
                  <span className="mr-2 text-sm text-muted-foreground">({check.notes})</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

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
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-heading font-bold">تقارير الزيارات</h2>
                  
                </div>

                <div className="space-y-6">
                  {visits
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                    .map((visit) => (
                      <div key={visit.id} className="border-b pb-6 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">
                            {visit.visitType === 'first' && 'الزيارة الأولى'}
                            {visit.visitType === 'second' && 'الزيارة الثانية'}
                            {visit.visitType === 'additional' && `الزيارة الإضافية ${getVisitNumber(visit)}`}
                          </h3>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(visit.visitDate)}
                            {visit.status === 'scheduled' && ' (مجدولة)'}
                          </div>
                        </div>

                        {/* Show read-only results for completed visits */}
                        {isVisitCompleted(visit.status) && renderVisitResults(visit)}

                        {/* Show VisitChecks component for editable visits */}
                        {visit.status === 'scheduled' && (
                          <VisitChecks
                            visitId={visit.id}
                            stationId={stationId}
                            visitType={visit.visitType}
                            initialChecks={visit.checks || []}
                            onChecksComplete={handleChecksComplete}
                            visitNumber={getVisitNumber(visit)}
                            isCompleted={isVisitCompleted(visit.status)}
                            failedChecks={visit.visitType === 'additional' ? getFailedChecks(visits) : []}
                          />
                        )}
                      </div>
                    ))}
                </div>
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
                          onClick={() => setShowPaymentConfirmation(true)}
                        >
                          تقديم إثبات الدفع
                        </Button>
                      )}
                      {station.status === "payment-confirmed" && (
                        <Button 
                          className="w-full" 
                          onClick={() => setShowCommitteeAssignment(true)}
                        >
                          تعيين اللجنة
                        </Button>
                      )}
                      {(station.status === "committee-assigned" || 
                        station.status === "هناك فشل في بعض التجارب" || 
                        station.status === "يمكن للمحطة استخراج خطاب تشغيل" ||
                        station.status === "تحت الإختبار") && (
                        <Button 
                          className="w-full" 
                          onClick={() => setShowVisitSchedule(true)}
                        >
                          {station.status === "committee-assigned" ? "إنشاء زيارة" : "إنشاء زيارة إضافية"}
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
                      onClick={() => setShowPaymentConfirmation(true)}
                    >
                      تأكيد الدفع
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Station Actions */}
        {/* <Card className="shadow">
          <CardContent className="p-6">
            <h2 className="text-xl font-heading font-bold mb-4 pb-2 border-b">الإجراءات</h2>
            
            <div className="space-y-4">
              {station.status === "pending-payment" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    يرجى تقديم إثبات الدفع لمتابعة الإجراءات
                  </p>
                  <Button 
                    className="w-full" 
                    onClick={() => setShowPaymentConfirmation(true)}
                  >
                    تقديم إثبات الدفع
                  </Button>
                </div>
              )}
              
              {station.status === "payment-confirmed" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    تم تأكيد الدفع. يرجى تعيين اللجنة للمتابعة
                  </p>
                  <Button 
                    className="w-full" 
                    onClick={() => setShowCommitteeAssignment(true)}
                  >
                    تعيين اللجنة
                  </Button>
                </div>
              )}
              
              {shouldShowAdditionalVisitButton && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    يمكنك إنشاء زيارة إضافية للمحطة
                  </p>
                  <Button 
                    className="w-full" 
                    onClick={() => setShowVisitSchedule(true)}
                  >
                    إنشاء زيارة إضافية
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card> */}
      </main>

      {/* Modals */}
      {showPaymentConfirmation && (
        <PaymentConfirmationModal
          isOpen={showPaymentConfirmation}
          onClose={() => setShowPaymentConfirmation(false)}
          stationId={stationId}
        />
      )}

      {showCommitteeAssignment && (
        <CommitteeAssignmentModal
          isOpen={showCommitteeAssignment}
          onClose={() => setShowCommitteeAssignment(false)}
          stationId={stationId}
        />
      )}

      {showVisitSchedule && (
        <VisitScheduleModal
          isOpen={showVisitSchedule}
          onClose={() => setShowVisitSchedule(false)}
          stationId={stationId}
          onSuccess={fetchVisits}
        />
      )}
    </div>
  );
}
