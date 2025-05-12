import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import PageHeader from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface Payment {
  id: string;
  stationId: string;
  stationName: string;
  stationCode: string;
  amount: number;
  status: "paid" | "pending" | "cancelled";
  date: string | null;
  invoiceNumber: string | null;
  paymentMethod: "bank_transfer" | "cash" | "cheque" | null;
}

const paymentStatusNames = {
  paid: "تم الدفع",
  pending: "قيد الانتظار",
  cancelled: "ملغي",
};

const paymentMethodNames = {
  bank_transfer: "تحويل بنكي",
  cash: "نقدي",
  cheque: "شيك",
};

export default function PaymentsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    status: "",
    date: "",
    search: "",
  });
  
  // Fetch payments data
  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    enabled: user?.role === "admin" || user?.role === "secretary",
  });
  
  // Only admin and secretary can access this page
  if (user?.role !== "admin" && user?.role !== "secretary") {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-grow p-6 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">غير مصرح بالوصول</h2>
              <p className="text-muted-foreground">ليس لديك صلاحية للوصول إلى صفحة المدفوعات</p>
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
      date: "",
      search: "",
    });
  };
  
  // Calculate statistics
  const totalPaid = payments
    .filter(p => p.status === "paid")
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  const totalPending = payments
    .filter(p => p.status === "pending")
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-grow p-6 overflow-auto">
        <PageHeader 
          title="المدفوعات" 
          description="إدارة ومتابعة مدفوعات محطات الخلط"
          actions={
            <Button variant="outline">
              <span className="material-icons ml-1">print</span>
              تقرير المدفوعات
            </Button>
          }
        />
        
        {/* Payment Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">إجمالي المدفوعات</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <h3 className="text-2xl font-bold">{formatCurrency(totalPaid)}</h3>
                  )}
                </div>
                <div className="bg-success/10 p-3 rounded-full">
                  <span className="material-icons text-success">payments</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">مدفوعات قيد الانتظار</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <h3 className="text-2xl font-bold">{formatCurrency(totalPending)}</h3>
                  )}
                </div>
                <div className="bg-warning/10 p-3 rounded-full">
                  <span className="material-icons text-warning">pending</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">إجمالي الرسوم</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <h3 className="text-2xl font-bold">{formatCurrency(totalAmount)}</h3>
                  )}
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <span className="material-icons text-primary">account_balance_wallet</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="filter-status" className="block text-sm font-medium mb-1">حالة الدفع</label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => handleFilterChange("status", value)}
                  >
                    <SelectTrigger id="filter-status">
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="paid">تم الدفع</SelectItem>
                      <SelectItem value="pending">قيد الانتظار</SelectItem>
                      <SelectItem value="cancelled">ملغي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label htmlFor="filter-date" className="block text-sm font-medium mb-1">تاريخ الدفع</label>
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
                    placeholder="اسم المحطة، رقم الفاتورة..." 
                    value={filters.search} 
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            {/* Payments Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-muted border-b">
                    <th className="py-3 px-4 text-right font-medium">رقم الفاتورة</th>
                    <th className="py-3 px-4 text-right font-medium">اسم المحطة</th>
                    <th className="py-3 px-4 text-right font-medium">كود المحطة</th>
                    <th className="py-3 px-4 text-right font-medium">المبلغ</th>
                    <th className="py-3 px-4 text-right font-medium">تاريخ الدفع</th>
                    <th className="py-3 px-4 text-right font-medium">طريقة الدفع</th>
                    <th className="py-3 px-4 text-right font-medium">الحالة</th>
                    <th className="py-3 px-4 text-right font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-4 text-center">جاري التحميل...</td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-4 text-center">لا توجد مدفوعات</td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4">
                          {payment.invoiceNumber || "-"}
                        </td>
                        <td className="py-3 px-4">
                          <Link href={`/station/${payment.stationId}`} className="text-primary hover:underline">
                            {payment.stationName}
                          </Link>
                        </td>
                        <td className="py-3 px-4">{payment.stationCode}</td>
                        <td className="py-3 px-4">{formatCurrency(payment.amount)}</td>
                        <td className="py-3 px-4">{payment.date ? formatDate(payment.date) : "-"}</td>
                        <td className="py-3 px-4">
                          {payment.paymentMethod ? paymentMethodNames[payment.paymentMethod as keyof typeof paymentMethodNames] : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span 
                            className={`px-2 py-1 rounded-full text-xs
                              ${payment.status === 'paid' ? 'bg-success/10 text-success' : 
                                payment.status === 'pending' ? 'bg-warning/10 text-warning' : 
                                'bg-destructive/10 text-destructive'}`}
                          >
                            {paymentStatusNames[payment.status as keyof typeof paymentStatusNames]}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2 space-x-reverse">
                            <Button variant="ghost" size="icon" className="text-primary">
                              <span className="material-icons">visibility</span>
                            </Button>
                            {payment.status === "pending" && (
                              <Button variant="ghost" size="icon" className="text-success">
                                <span className="material-icons">check_circle</span>
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="text-muted-foreground">
                              <span className="material-icons">receipt_long</span>
                            </Button>
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
                عرض 1-4 من 4 نتيجة
              </div>
              <div className="flex">
                <Button variant="outline" size="sm" disabled className="rounded-r-md">
                  السابق
                </Button>
                <Button variant="outline" size="sm" className="bg-primary text-white border-primary">
                  1
                </Button>
                <Button variant="outline" size="sm" disabled className="rounded-l-md">
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
