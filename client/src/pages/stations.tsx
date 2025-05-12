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
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface Station {
  id: number;
  code: string;
  name: string;
  location: string;
  owner: string;
  mixersCount: number;
  status: "pending-payment" | "scheduled" | "visited" | "approved" | "pending-documents";
  approvalEndDate: string | null;
  distance: number;
}

export default function StationsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    status: "",
    location: "",
    search: "",
  });
  
  // Fetch stations data
  const { data: stations = [], isLoading } = useQuery<Station[]>({
    queryKey: ["/api/stations"],
    enabled: user?.role === "admin" || user?.role === "secretary" || user?.role === "client",
  });
  
  // Fetch station statistics
  const { data: statsData, isLoading: statsLoading } = useQuery<{
    totalStations: number;
    approvedStations: number;
    unapprovedStations: number;
  }>({
    queryKey: ["/api/stations/stats"],
    enabled: user?.role === "admin" || user?.role === "secretary" || user?.role === "client",
  });
  
  // Allow admin, secretary, and client roles to access stations
  const allowedRoles = ["admin", "secretary", "client"];
  if (!allowedRoles.includes(user?.role || "")) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-grow p-6 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">غير مصرح بالوصول</h2>
              <p className="text-muted-foreground">ليس لديك صلاحية للوصول إلى صفحة المحطات</p>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // For client role, filter to only show their stations
  const filteredStations = user?.role === "client" 
    ? stations.filter(station => station.owner === user.name)
    : stations;
  
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  
  const clearFilters = () => {
    setFilters({
      status: "",
      location: "",
      search: "",
    });
  };
  
  // Calculate unique locations for filter dropdown
  const locationsSet = new Set<string>();
  stations.forEach(station => station.location && locationsSet.add(station.location));
  const locations = Array.from(locationsSet);
  
  // Calculate expiring soon stations (within 30 days)
  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(today.getDate() + 30);
  
  const expiringSoonCount = stations.filter(station => {
    if (!station.approvalEndDate) return false;
    const expiryDate = new Date(station.approvalEndDate);
    return expiryDate >= today && expiryDate <= thirtyDaysLater;
  }).length;
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-grow p-6 overflow-auto">
        <PageHeader 
          title="محطات الخلط" 
          description="عرض وإدارة محطات الخلط الخرسانية"
          actions={
            (user?.role === "admin" || user?.role === "secretary") && (
              <Link href="/new-request">
                <Button className="flex items-center">
                  <span className="material-icons ml-1">add</span>
                  محطة جديدة
                </Button>
              </Link>
            )
          }
        />
        
        {/* Station Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">إجمالي المحطات</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <h3 className="text-2xl font-bold">{statsData?.totalStations ?? 0}</h3>
                  )}
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <span className="material-icons text-primary">business</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">محطات معتمدة</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <h3 className="text-2xl font-bold">{statsData?.approvedStations ?? 0}</h3>
                  )}
                </div>
                <div className="bg-success/10 p-3 rounded-full">
                  <span className="material-icons text-success">verified</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">محطات غير معتمدة</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <h3 className="text-2xl font-bold">{statsData?.unapprovedStations ?? 0}</h3>
                  )}
                </div>
                <div className="bg-warning/10 p-3 rounded-full">
                  <span className="material-icons text-warning">warning</span>
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
                  <label htmlFor="filter-location" className="block text-sm font-medium mb-1">الموقع</label>
                  <Select 
                    value={filters.location} 
                    onValueChange={(value) => handleFilterChange("location", value)}
                  >
                    <SelectTrigger id="filter-location">
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {locations.map(location => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            
            {/* Stations List - Grid View */}
            {isLoading ? (
              <div className="text-center py-10">
                <p>جاري التحميل...</p>
              </div>
            ) : filteredStations.length === 0 ? (
              <div className="text-center py-10">
                <p>لا توجد محطات</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStations.map((station) => (
                  <Card key={station.id} className="shadow-sm hover:shadow transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <Link href={`/station/${station.id}`}>
                          <h3 className="font-heading font-bold text-lg text-primary hover:underline cursor-pointer truncate max-w-[200px]">
                            {station.name}
                          </h3>
                        </Link>
                        <StatusBadge status={station.status} />
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4">
                        كود المحطة: {station.code}
                      </p>
                      
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex items-center">
                          <span className="material-icons text-primary text-sm ml-2">location_on</span>
                          <span>{station.location}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="material-icons text-primary text-sm ml-2">business</span>
                          <span>{station.owner}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="material-icons text-primary text-sm ml-2">category</span>
                          <span>عدد الخلاطات: {station.mixersCount}</span>
                        </div>
                        {station.approvalEndDate && (
                          <div className="flex items-center">
                            <span className="material-icons text-primary text-sm ml-2">event</span>
                            <span>تاريخ انتهاء الشهادة: {formatDate(station.approvalEndDate)}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Link href={`/station/${station.id}`}>
                          <Button variant="outline" size="sm">
                            عرض التفاصيل
                          </Button>
                        </Link>
                        {(user?.role === "admin" || user?.role === "secretary") && (
                          station.status === "approved" && (
                            <Button variant="secondary" size="sm">
                              تجديد الاعتماد
                            </Button>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <div className="text-muted-foreground">
                عرض 1-{filteredStations.length} من {filteredStations.length} نتيجة
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
