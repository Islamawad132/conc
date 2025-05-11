import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import PageHeader from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";

// Mock station data for demonstration purposes
const stationData = {
  id: "142",
  code: "BMI/RM/2023/142",
  name: "محطة الإسكندرية للخرسانة",
  owner: "شركة الإنشاءات المصرية",
  taxNumber: "546-872-123",
  address: "طريق الإسكندرية الصحراوي الكيلو 32",
  cityDistrict: "برج العرب",
  distance: 120,
  approvalType: "first-time",
  approvalTypeName: "اعتماد أول مرة",
  
  // Technical info
  mixersCount: 2,
  maxCapacity: 2.5,
  mixingType: "normal",
  mixingTypeName: "عادي",
  reportLanguage: "both",
  reportLanguageName: "عربي وإنجليزي",
  accommodation: "station",
  accommodationName: "المحطة",
  
  // Contact info
  representativeName: "أحمد محمود",
  representativePhone: "01012345678",
  representativeId: "29012011234567",
  qualityManagerName: "محمد عبد الرحمن",
  qualityManagerPhone: "01123456789",
  
  // Status info
  status: "scheduled",
  requestDate: "2023-06-15",
  nextVisitDate: "2023-07-05",
  
  // Payment info
  totalFees: 5800,
  paymentStatus: "paid",
  invoiceNumber: "INV-2023-568",
  invoiceDate: "2023-06-18",
  
  // Committee info
  committee: [
    { name: "د. عبد الرحمن محمود", role: "رئيس اللجنة" },
    { name: "م. سمير عبد الله", role: "المهندس" },
    { name: "أ. محمد أحمد", role: "السكرتير" },
  ]
};

// Mock visit data
const visitData = {
  firstVisit: {
    date: "2023-06-20",
    report: "/path/to/report.pdf",
    checks: [
      { id: "scale-calibration-1", name: "الانتهاء من معايرة الموازين (الخلاطة 1)", status: true },
      { id: "scale-calibration-2", name: "الانتهاء من معايرة الموازين (الخلاطة 2)", status: true },
      { id: "press-calibration", name: "الانتهاء من معايرة ماكينة اختبار الضغط", status: true },
      { id: "uniformity-tests-1", name: "الانتهاء من اختبارات التجانس (الخلاطة 1)", status: true },
      { id: "uniformity-tests-2", name: "الانتهاء من اختبارات التجانس (الخلاطة 2)", status: false },
      { id: "chloride-sulfate-tests", name: "اختبارات محتوى الكلوريدات والكبريتات تفي بحدود الكود المصري", status: true },
      { id: "water-chemical-tests", name: "الاختبارات الكيميائية للماء تفي بحدود الكود المصري", status: true },
    ]
  },
  secondVisit: {
    date: "2023-07-05",
    status: "scheduled"
  }
};

export default function StationDetailsPage() {
  const { user } = useAuth();
  const params = useParams();
  const [isLoading] = useState(false);
  
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
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-grow p-6 overflow-auto">
        <PageHeader 
          title={stationData.name} 
          description={`كود المحطة: ${stationData.code}`}
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
                    <p className="font-medium">{stationData.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">الجهة المالكة للمحطة</p>
                    <p className="font-medium">{stationData.owner}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">الرقم الضريبي</p>
                    <p className="font-medium">{stationData.taxNumber}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">عنوان المحطة</p>
                    <p className="font-medium">{stationData.address}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">جهاز المدينة/الحي</p>
                    <p className="font-medium">{stationData.cityDistrict}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">المسافة بين المحطة والمركز (كم)</p>
                    <p className="font-medium">{stationData.distance}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">نوع الاعتماد</p>
                    <p className="font-medium">{stationData.approvalTypeName}</p>
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
                    <p className="font-medium">{stationData.mixersCount}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">أقصى سعة للخلاطة</p>
                    <p className="font-medium">{stationData.maxCapacity} م³</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">نوع الخلط</p>
                    <p className="font-medium">{stationData.mixingTypeName}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">لغة التقرير</p>
                    <p className="font-medium">{stationData.reportLanguageName}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">توفير الإقامة أثناء الزيارات</p>
                    <p className="font-medium">{stationData.accommodationName}</p>
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
                    <p className="font-medium">{stationData.representativeName}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">رقم تليفون المندوب</p>
                    <p className="font-medium">{stationData.representativePhone}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">الرقم القومي للمندوب</p>
                    <p className="font-medium">{stationData.representativeId}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">اسم مدير الجودة بالمحطة</p>
                    <p className="font-medium">{stationData.qualityManagerName}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">رقم تليفون مدير الجودة</p>
                    <p className="font-medium">{stationData.qualityManagerPhone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Visit Reports */}
            <Card className="shadow">
              <CardContent className="p-6">
                <h2 className="text-xl font-heading font-bold mb-4 pb-2 border-b">تقارير الزيارات</h2>
                
                <div className="mb-6">
                  <h3 className="font-bold mb-2">الزيارة الأولى</h3>
                  <p className="text-muted-foreground text-sm mb-2">تاريخ الزيارة: {visitData.firstVisit.date}</p>
                  
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <ul className="space-y-3">
                      {visitData.firstVisit.checks.map((check) => (
                        <li key={check.id} className="flex items-center">
                          <span className={`material-icons ml-2 ${check.status ? 'text-success' : 'text-destructive'}`}>
                            {check.status ? 'check_circle' : 'cancel'}
                          </span>
                          <span>{check.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex">
                    <Button variant="link" className="text-primary p-0 h-auto">
                      <span className="material-icons ml-1 text-sm">description</span>
                      محضر الزيارة الأولى
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-bold mb-2">الزيارة الثانية</h3>
                  <p className="text-muted-foreground text-sm mb-2">تاريخ الزيارة: {visitData.secondVisit.date} (مجدولة)</p>
                  
                  <div className="flex">
                    <span className="px-3 py-1 rounded-full bg-primary bg-opacity-10 text-primary text-sm">
                      بانتظار الزيارة
                    </span>
                  </div>
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
                      <StatusBadge status={stationData.status as any} />
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">تاريخ استلام الطلب</p>
                    <p className="font-medium">{stationData.requestDate}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">تاريخ الزيارة القادمة</p>
                    <p className="font-medium">{stationData.nextVisitDate}</p>
                  </div>
                  
                  {(user?.role === "secretary" || user?.role === "engineer") && (
                    <Button className="w-full mt-2" variant="secondary">
                      تحديث حالة المحطة
                    </Button>
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
                    <p className="font-medium">{stationData.totalFees.toLocaleString()} جنيه</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">حالة الدفع</p>
                    <div className="mt-1">
                      <span className="px-3 py-1 rounded-full bg-success bg-opacity-10 text-success text-sm">
                        تم الدفع
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">رقم خطاب الوارد</p>
                    <p className="font-medium">{stationData.invoiceNumber}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-sm">تاريخ توريد الخطاب</p>
                    <p className="font-medium">{stationData.invoiceDate}</p>
                  </div>
                  
                  {user?.role === "secretary" && (
                    <Button className="w-full mt-2" variant="outline">
                      تفاصيل الدفع
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Committee Info */}
            <Card className="shadow">
              <CardContent className="p-6">
                <h2 className="text-xl font-heading font-bold mb-4 pb-2 border-b">اللجنة المسؤولة</h2>
                
                <div className="space-y-3">
                  {stationData.committee.map((member, index) => (
                    <div key={index} className="flex items-center">
                      <div className="bg-primary rounded-full w-10 h-10 flex items-center justify-center ml-3 text-white">
                        <span className="material-icons">person</span>
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-muted-foreground text-sm">{member.role}</p>
                      </div>
                    </div>
                  ))}
                  
                  {user?.role === "secretary" && (
                    <Button className="w-full mt-2">
                      تغيير أعضاء اللجنة
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
