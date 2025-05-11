import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import PageHeader from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

// Mock data for demonstration purposes
const approvalRequests = [
  {
    id: "142",
    code: "BMI/RM/2023/142",
    name: "محطة الإسكندرية للخرسانة",
    approvalType: "first-time",
    approvalTypeName: "اعتماد أول مرة",
    requestDate: "2023-06-15",
    distance: 120,
    status: "pending-payment",
  },
  {
    id: "141",
    code: "BMI/RM/2023/141",
    name: "محطة القاهرة الجديدة",
    approvalType: "renewal",
    approvalTypeName: "تجديد اعتماد",
    requestDate: "2023-06-12",
    distance: 50,
    status: "scheduled",
  },
  {
    id: "140",
    code: "BMI/RM/2023/140",
    name: "محطة المنصورة للخلط",
    approvalType: "first-time",
    approvalTypeName: "اعتماد أول مرة",
    requestDate: "2023-06-10",
    distance: 180,
    status: "approved",
  },
  {
    id: "139",
    code: "BMI/RM/2023/139",
    name: "محطة أسيوط للخرسانة",
    approvalType: "renewal",
    approvalTypeName: "تجديد اعتماد",
    requestDate: "2023-06-08",
    distance: 300,
    status: "pending-documents",
  },
];

export default function ApprovalRequestsPage() {
  const { user } = useAuth();
  const [isLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    date: "",
    search: "",
  });
  
  // Only admin, secretary, and engineer can access this page
  if (user?.role !== "admin" && user?.role !== "secretary" && user?.role !== "engineer") {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-grow p-6 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">غير مصرح بالوصول</h2>
              <p className="text-muted-foreground">ليس لديك صلاحية للوصول إلى صفحة طلبات الاعتماد</p>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  
  const clearFilters = () => {
    setFilters({
      status: "",
      type: "",
      date: "",
      search: "",
    });
  };
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-grow p-6 overflow-auto">
        <PageHeader 
          title="طلبات اعتماد المحطات" 
          description="إدارة ومتابعة طلبات اعتماد محطات الخلط"
          actions={
            user?.role === "secretary" && (
              <Link href="/new-request">
                <Button variant="secondary" className="flex items-center">
                  <span className="material-icons ml-1">add</span>
                  طلب جديد
                </Button>
              </Link>
            )
          }
        />
        
        <Card className="shadow">
          <CardContent className="p-6">
            {/* Filters */}
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">تصفية النتائج</h3>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  مسح التصفية
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="filter-status" className="block text-sm font-medium mb-1">الحالة</label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => handleFilterChange("status", value)}
                  >
                    <SelectTrigger id="filter-status">
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="pending-payment">بانتظار الدفع</SelectItem>
                      <SelectItem value="scheduled">تمت جدولة الزيارة</SelectItem>
                      <SelectItem value="visited">تمت الزيارة</SelectItem>
                      <SelectItem value="approved">معتمد</SelectItem>
                      <SelectItem value="pending-documents">بانتظار المستندات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label htmlFor="filter-type" className="block text-sm font-medium mb-1">نوع الاعتماد</label>
                  <Select 
                    value={filters.type} 
                    onValueChange={(value) => handleFilterChange("type", value)}
                  >
                    <SelectTrigger id="filter-type">
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="first-time">اعتماد أول مرة</SelectItem>
                      <SelectItem value="renewal">تجديد اعتماد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label htmlFor="filter-date" className="block text-sm font-medium mb-1">تاريخ الطلب</label>
                  <Input 
                    type="date" 
                    id="filter-date" 
                    value={filters.date} 
                    onChange={(e) => handleFilterChange("date", e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor="filter-search" className="block text-sm font-medium mb-1">بحث</label>
                  <Input 
                    type="text" 
                    id="filter-search" 
                    placeholder="اسم المحطة، الكود..." 
                    value={filters.search} 
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            {/* Requests Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-muted border-b">
                    <th className="py-3 px-4 text-right font-medium">كود المحطة</th>
                    <th className="py-3 px-4 text-right font-medium">اسم المحطة</th>
                    <th className="py-3 px-4 text-right font-medium">نوع الاعتماد</th>
                    <th className="py-3 px-4 text-right font-medium">تاريخ الطلب</th>
                    <th className="py-3 px-4 text-right font-medium">المسافة (كم)</th>
                    <th className="py-3 px-4 text-right font-medium">الحالة</th>
                    <th className="py-3 px-4 text-right font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-center">جاري التحميل...</td>
                    </tr>
                  ) : approvalRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-center">لا توجد طلبات اعتماد</td>
                    </tr>
                  ) : (
                    approvalRequests.map((request) => (
                      <tr key={request.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4">
                          <Link href={`/station/${request.id}`} className="text-primary hover:underline">
                            {request.code}
                          </Link>
                        </td>
                        <td className="py-3 px-4">{request.name}</td>
                        <td className="py-3 px-4">{request.approvalTypeName}</td>
                        <td className="py-3 px-4">{formatDate(request.requestDate)}</td>
                        <td className="py-3 px-4">{request.distance}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={request.status as any} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2 space-x-reverse">
                            <Link href={`/station/${request.id}`}>
                              <Button variant="ghost" size="icon" className="text-primary">
                                <span className="material-icons">visibility</span>
                              </Button>
                            </Link>
                            
                            {user?.role === "secretary" && (
                              <>
                                <Button variant="ghost" size="icon" className="text-muted-foreground">
                                  <span className="material-icons">edit</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive">
                                  <span className="material-icons">delete</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <div className="text-muted-foreground">
                عرض 1-4 من 42 نتيجة
              </div>
              <div className="flex">
                <Button variant="outline" size="sm" disabled className="rounded-r-md">
                  السابق
                </Button>
                <Button variant="outline" size="sm" className="bg-primary text-white border-primary">
                  1
                </Button>
                <Button variant="outline" size="sm">
                  2
                </Button>
                <Button variant="outline" size="sm">
                  3
                </Button>
                <Button variant="outline" size="sm" className="rounded-l-md">
                  التالي
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
