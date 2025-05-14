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
import { OperationLetterModal } from "@/components/modals/operation-letter-modal";
import { ApprovalCertificateModal } from "@/components/modals/approval-certificate-modal";
import { toast } from "sonner";
import { VisitChecks } from "@/components/visit-checks";
import { Badge } from "@/components/ui/badge";
import { StationStatus } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";

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
  committee?: Array<{ name: string; role: string; phone?: string }>;
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

const calculateAllVisitsResults = (visits: Visit[]): AllVisitsResults => {
  console.log('Client calculating results from visits:', visits);
  
  // Sort visits by date in ascending order
  const sortedVisits = [...visits].sort((a, b) => 
    new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()
  );

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

  // First, process the first visit to get initial results
  const firstVisit = sortedVisits.find(v => v.visitType === 'first');
  if (firstVisit?.checks) {
    for (const check of firstVisit.checks) {
      if (firstSixTests.includes(check.itemId)) {
        results.first6Tests[check.itemId] = {
          status: check.status,
          visitId: firstVisit.id,
          visitDate: new Date(firstVisit.visitDate)
        };
      } else if (check.itemId === "28day-compression-strength") {
        results.test7 = {
          status: check.status,
          visitId: firstVisit.id,
          visitDate: new Date(firstVisit.visitDate)
        };
      }
    }
  }

  // Then process additional visits to update failed or pending tests
  const additionalVisits = sortedVisits
    .filter(v => v.visitType === 'additional')
    .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());

  for (const visit of additionalVisits) {
    if (!visit.checks) continue;

    for (const check of visit.checks) {
      // For first 6 tests in additional visits, only update if previously failed
      if (firstSixTests.includes(check.itemId)) {
        const currentResult = results.first6Tests[check.itemId];
        if (currentResult.status === 'failed') {
          results.first6Tests[check.itemId] = {
            status: check.status,
            visitId: visit.id,
            visitDate: new Date(visit.visitDate)
          };
        }
      }
      // For test 7, always use the most recent result from additional visits
      else if (check.itemId === "28day-compression-strength") {
        results.test7 = {
          status: check.status,
          visitId: visit.id,
          visitDate: new Date(visit.visitDate)
        };
      }
    }
  }

  console.log('Client calculated final results:', results);
  return results;
};

function determineStationStatus(results: AllVisitsResults): { status: StationStatus; allowAdditionalVisit: boolean } {
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
      allowAdditionalVisit: true
    };
  }

  return {
    status: "تحت الإختبار",
    allowAdditionalVisit: true
  };
}

export default function StationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const stationId = parseInt(id || "0");
  const { user } = useAuth();
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [showCommitteeAssignment, setShowCommitteeAssignment] = useState(false);
  const [showVisitSchedule, setShowVisitSchedule] = useState(false);
  const [showOperationLetter, setShowOperationLetter] = useState(false);
  const [showApprovalCertificate, setShowApprovalCertificate] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [aggregatedResults, setAggregatedResults] = useState<AllVisitsResults | null>(null);
  const queryClient = useQueryClient();

  const { data: station, isLoading } = useQuery<Station>({
    queryKey: [`/api/stations/${stationId}`],
    enabled: !!stationId
  });

  const fetchVisits = async () => {
    try {
      const response = await fetch(`/api/stations/${id}/visits`);
      if (!response.ok) {
        throw new Error("Failed to fetch visits");
      }
      const data = await response.json();
      setVisits(data);
      
      // Calculate and set aggregated results
      const results = calculateAllVisitsResults(data);
      setAggregatedResults(results);
      
      // Refresh station data to get the updated status
      if (data.length > 0) {
        const stationResponse = await fetch(`/api/stations/${id}`);
        if (stationResponse.ok) {
          const stationData = await stationResponse.json();
          // Force a refresh of the station data in React Query cache
          queryClient.setQueryData([`/api/stations/${stationId}`], stationData);
        }
      }
    } catch (error) {
      console.error("Error fetching visits:", error);
      toast.error("حدث خطأ أثناء جلب بيانات الزيارات");
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [id]);

  const handleChecksComplete = async () => {
    try {
      // Fetch visits to get the latest data
      await fetchVisits();
      
      // Force a recalculation of station status on the server
      const recalcResponse = await fetch(`/api/stations/${stationId}/recalculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      });

      if (!recalcResponse.ok) {
        throw new Error("Failed to recalculate station status");
      }
      
      // Refresh the data again to get the updated status
      await fetchVisits();
      
      toast.success("تم تحديث حالة المحطة بنجاح");
    } catch (error) {
      console.error("Error updating station status:", error);
      toast.error("حدث خطأ أثناء تحديث حالة المحطة");
    }
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

  const renderAggregatedResults = () => {
    if (!aggregatedResults) return null;

    return (
      <div className="bg-muted p-4 rounded-lg mb-4">
        <h4 className="font-semibold mb-4">النتائج النهائية للاختبارات:</h4>
        <div className="space-y-3">
          {Object.entries(aggregatedResults.first6Tests).map(([testId, result]) => (
            <div key={testId} className="flex items-center justify-between">
              <span>{visitCheckItemNames[testId as VisitCheckItem]}</span>
              <div className={`px-3 py-1 rounded-full ${
                result.status === 'passed' ? 'bg-success/20 text-success' :
                result.status === 'failed' ? 'bg-destructive/20 text-destructive' :
                'bg-muted text-muted-foreground'
              }`}>
                {result.status === 'passed' ? 'ناجح' :
                 result.status === 'failed' ? 'فاشل' :
                 'تحت الاختبار'}
              </div>
            </div>
          ))}
          {aggregatedResults.test7.status && (
            <div className="flex items-center justify-between">
              <span>{visitCheckItemNames["28day-compression-strength"]}</span>
              <div className={`px-3 py-1 rounded-full ${
                aggregatedResults.test7.status === 'passed' ? 'bg-success/20 text-success' :
                aggregatedResults.test7.status === 'failed' ? 'bg-destructive/20 text-destructive' :
                'bg-muted text-muted-foreground'
              }`}>
                {aggregatedResults.test7.status === 'passed' ? 'ناجح' :
                 aggregatedResults.test7.status === 'failed' ? 'فاشل' :
                 'تحت الاختبار'}
              </div>
            </div>
          )}
        </div>
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
            {/* Add aggregated results at the top */}
            <Card className="shadow">
              <CardContent className="p-6">
                <h2 className="text-xl font-heading font-bold mb-4 pb-2 border-b">نتائج الاختبارات النهائية</h2>
                {renderAggregatedResults()}
              </CardContent>
            </Card>
            
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
            
            {/* Committee Info */}
            {station.committee && station.committee.length > 0 && (
              <Card className="shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-heading font-bold">اللجنة المسؤولة</h2>
                    {user?.role === "admin" && station.status !== "تم اعتماد المحطة" && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowCommitteeAssignment(true)}
                        >
                          <span className="material-icons ml-1 text-sm">edit</span>
                          تعديل اللجنة
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {station.committee.map((member, index) => (
                      <div key={index} className="p-4 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center mb-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mr-3">
                            <span className="material-icons text-primary">
                              {member.role === "chairman" ? "stars" : 
                               member.role === "engineer" ? "engineering" : 
                               member.role === "secretary" ? "edit_note" : "person"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-lg">{member.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {member.role === "chairman" ? "رئيس اللجنة" : 
                               member.role === "engineer" ? "مهندس" : 
                               member.role === "secretary" ? "سكرتير" : member.role}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
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
                        {isVisitCompleted(visit.status) && (
                          <div className="bg-muted p-4 rounded-lg mb-4">
                            <h4 className="font-semibold mb-2">
                              نتائج الزيارة:
                            </h4>
                            <ul className="space-y-2">
                              {visit.checks?.map((check) => (
                                <li key={check.itemId} className="flex items-center">
                                  <span className={`material-icons ml-2 ${check.status === 'passed' ? 'text-success' : 'text-destructive'}`}>
                                    {check.status === 'passed' ? 'check_circle' : 'cancel'}
                                  </span>
                                  <span>{visitCheckItemNames[check.itemId]}</span>
                                  {check.notes && (
                                    <span className="mr-2 text-sm text-muted-foreground">({check.notes})</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

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
                      {(station.status === "payment-confirmed" || (user?.role === "admin" && !station.committee)) && (
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
                      {station.status === "يمكن للمحطة استخراج خطاب تشغيل" && (
                        <Button 
                          className="w-full"
                          variant="secondary"
                          onClick={() => setShowOperationLetter(true)}
                        >
                          <span className="material-icons ml-1 align-middle">description</span>
                          استخراج خطاب تشغيل
                        </Button>
                      )}
                      {station.status === "تم اعتماد المحطة" && (
                        <Button 
                          className="w-full"
                          variant="secondary"
                          onClick={() => setShowApprovalCertificate(true)}
                        >
                          <span className="material-icons ml-1 align-middle">verified</span>
                          استخراج شهادة الاعتماد
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
      
      {showOperationLetter && (
        <OperationLetterModal
          isOpen={showOperationLetter}
          onClose={() => setShowOperationLetter(false)}
          stationId={stationId}
          stationName={station.name}
        />
      )}
      
      {showApprovalCertificate && (
        <ApprovalCertificateModal
          isOpen={showApprovalCertificate}
          onClose={() => setShowApprovalCertificate(false)}
          stationId={stationId}
          stationName={station.name}
        />
      )}
    </div>
  );
}
