import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import PageHeader from "@/components/layout/page-header";
import { 
  ApprovalType, 
  MixingType, 
  ReportLanguage, 
  AccommodationType, 
  calculateFees, 
  formatCurrency 
} from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import MapPicker from "@/components/ui/map-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const newRequestSchema = z.object({
  // General Info
  stationName: z.string().min(1, { message: "يرجى إدخال اسم المحطة" }),
  owner: z.string().min(1, { message: "يرجى إدخال الجهة المالكة للمحطة" }),
  taxNumber: z.string().min(1, { message: "يرجى إدخال الرقم الضريبي" }),
  address: z.string().min(1, { message: "يرجى إدخال عنوان المحطة" }),
  cityDistrict: z.string().min(1, { message: "يرجى إدخال جهاز المدينة/الحي" }),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  distance: z.coerce.number().min(1, { message: "يرجى إدخال المسافة" }),
  approvalType: z.enum(["first-time", "renewal"]),
  certificateExpiryDate: z.string().optional(),
  
  // Station Info
  mixersCount: z.coerce.number().min(1, { message: "يرجى إدخال عدد الخلاطات" }),
  maxCapacity: z.coerce.number().min(0.1, { message: "يرجى إدخال أقصى سعة للخلاطة" }),
  mixingType: z.enum(["normal", "dry"]),
  reportLanguage: z.enum(["arabic", "english", "both"]),
  representativeName: z.string().min(1, { message: "يرجى إدخال اسم المندوب" }),
  representativePhone: z.string().min(1, { message: "يرجى إدخال رقم تليفون المندوب" }),
  representativeId: z.string().min(1, { message: "يرجى إدخال الرقم القومي للمندوب" }),
  qualityManagerName: z.string().min(1, { message: "يرجى إدخال اسم مدير الجودة بالمحطة" }),
  qualityManagerPhone: z.string().min(1, { message: "يرجى إدخال رقم تليفون مدير الجودة بالمحطة" }),
  qualityManagerId: z.string().min(1, { message: "يرجى إدخال الرقم القومي لمدير الجودة بالمحطة" }),
  accommodation: z.enum(["station", "center"]).optional(),
});

type FormValues = z.infer<typeof newRequestSchema>;

export default function NewRequestPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [fees, setFees] = useState({
    distanceCost: 0,
    mixersCost: 0,
    accommodationCost: 0,
    additionalReportCost: 0,
    taxCost: 0,
    totalCost: 0,
  });
  
  // Only admin, secretary, and client can access this page
  if (user?.role !== "admin" && user?.role !== "secretary" && user?.role !== "client") {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-grow p-6 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">غير مصرح بالوصول</h2>
              <p className="text-muted-foreground">ليس لديك صلاحية للوصول إلى صفحة طلب اعتماد جديد</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const [showMapDialog, setShowMapDialog] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  
  // مركز الخريطة الافتراضي (موقع المركز)
  const CENTER_POSITION: [number, number] = [30.0358493, 31.2077047];
  
  // دالة لحساب المسافة بين المركز والموقع المحدد (بالكيلومتر)
  const calculateDistanceFromCenter = (lat: number, lng: number): number => {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (lat - CENTER_POSITION[0]) * Math.PI / 180;
    const dLon = (lng - CENTER_POSITION[1]) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(CENTER_POSITION[0] * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // المسافة بالكيلومتر
    return Math.round(distance); // تقريب إلى أقرب كيلومتر
  };
  
  const form = useForm<FormValues>({
    resolver: zodResolver(newRequestSchema),
    defaultValues: {
      stationName: "",
      owner: "",
      taxNumber: "",
      address: "",
      cityDistrict: "",
      latitude: undefined,
      longitude: undefined,
      distance: 0,
      approvalType: "first-time",
      mixersCount: 1,
      maxCapacity: 0,
      mixingType: "normal",
      reportLanguage: "arabic",
      representativeName: "",
      representativePhone: "",
      representativeId: "",
      qualityManagerName: "",
      qualityManagerPhone: "",
      qualityManagerId: "",
      accommodation: undefined,
    },
  });
  
  // Watch values for conditional rendering and calculations
  const distance = form.watch("distance");
  const mixersCount = form.watch("mixersCount");
  const reportLanguage = form.watch("reportLanguage") as ReportLanguage;
  const approvalType = form.watch("approvalType") as ApprovalType;
  const accommodation = form.watch("accommodation") as AccommodationType | undefined;
  const needsAccommodation = distance > 200;

  // Effect to handle accommodation field when distance changes
  useEffect(() => {
    if (distance <= 200) {
      form.setValue("accommodation", undefined);
    } else if (!form.getValues("accommodation")) {
      form.setValue("accommodation", "station");
    }
  }, [distance, form]);
  
  const calculateFeesHandler = () => {
    const calculatedFees = calculateFees(
      distance,
      mixersCount,
      reportLanguage,
      accommodation || null
    );
    
    setFees(calculatedFees);
  };
  
  const onSubmit = async (data: FormValues) => {
    try {
      // Calculate total fees
      const calculatedFees = calculateFees(
        data.distance,
        data.mixersCount,
        data.reportLanguage,
        data.accommodation || null
      );

      // Make API call to create new station
      const response = await fetch('/api/stations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.stationName,
          owner: data.owner,
          taxNumber: data.taxNumber,
          address: data.address,
          cityDistrict: data.cityDistrict,
          location: data.latitude && data.longitude ? `${data.latitude},${data.longitude}` : undefined,
          distance: data.distance,
          approvalType: data.approvalType,
          certificateExpiryDate: data.approvalType === "renewal" && data.certificateExpiryDate ? 
            new Date(data.certificateExpiryDate).toISOString() : null,
          mixersCount: data.mixersCount,
          maxCapacity: data.maxCapacity.toString(),
          mixingType: data.mixingType,
          reportLanguage: data.reportLanguage,
          representativeName: data.representativeName,
          representativePhone: data.representativePhone,
          representativeId: data.representativeId,
          qualityManagerName: data.qualityManagerName,
          qualityManagerPhone: data.qualityManagerPhone,
          qualityManagerId: data.qualityManagerId,
          accommodation: data.distance > 200 ? data.accommodation : undefined,
          fees: Math.round(calculatedFees.totalCost),
          createdBy: user?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle validation errors
        if (errorData.errors) {
          const errorMessages = errorData.errors.map((error: any) => {
            switch (error.code) {
              case "invalid_type":
                if (error.path[0] === "certificateExpiryDate") {
                  return "تاريخ انتهاء الشهادة غير صحيح";
                }
                return `خطأ في نوع البيانات: ${error.path.join(".")}`;
              default:
                return error.message;
            }
          });
          
          toast({
            title: "خطأ في البيانات",
            description: errorMessages.join("\n"),
            variant: "destructive",
          });
          return;
        }
        
        throw new Error(errorData.message || 'فشل في إنشاء المحطة');
      }

      const station = await response.json();
      
      toast({
        title: "تم تقديم الطلب بنجاح",
        description: "سيتم مراجعة طلبك والرد عليك في أقرب وقت",
      });
      
      // Reset form
      form.reset();
      setFees({
        distanceCost: 0,
        mixersCost: 0,
        accommodationCost: 0,
        additionalReportCost: 0,
        taxCost: 0,
        totalCost: 0,
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "حدث خطأ",
        description: error instanceof Error ? error.message : "لم يتم تقديم الطلب بنجاح، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-grow p-6 overflow-auto">
        <PageHeader 
          title="طلب اعتماد محطة خلط جديد" 
          description="يرجى إدخال بيانات محطة الخلط لطلب الاعتماد"
        />
        
        <Card className="shadow">
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* البيانات العامة */}
                <div>
                  <h2 className="text-xl font-heading font-bold mb-4 pb-2 border-b">البيانات العامة</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="stationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم المحطة <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="owner"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الجهة المالكة للمحطة <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="taxNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الرقم الضريبي <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>عنوان المحطة <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="cityDistrict"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>جهاز المدينة/الحي <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormItem className="space-y-4">
                      <FormLabel>الموقع الجغرافي للمحطة <span className="text-destructive">*</span></FormLabel>
                      <div className="space-y-4 rounded-lg border p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <FormField
                              control={form.control}
                              name="latitude"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">خط العرض (Latitude)</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        step="0.000001"
                                        placeholder="مثال: 30.123456"
                                        className="text-left dir-ltr"
                                        {...field}
                                        onChange={(e) => {
                                          const lat = parseFloat(e.target.value);
                                          field.onChange(lat);
                                          const lng = form.getValues("longitude");
                                          if (lat && lng) {
                                            setSelectedLocation([lat, lng]);
                                            const distance = calculateDistanceFromCenter(lat, lng);
                                            form.setValue("distance", distance);
                                          }
                                        }}
                                        value={field.value || ""}
                                      />
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">°N</span>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div>
                            <FormField
                              control={form.control}
                              name="longitude"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">خط الطول (Longitude)</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        step="0.000001"
                                        placeholder="مثال: 31.123456"
                                        className="text-left dir-ltr"
                                        {...field}
                                        onChange={(e) => {
                                          const lng = parseFloat(e.target.value);
                                          field.onChange(lng);
                                          const lat = form.getValues("latitude");
                                          if (lat && lng) {
                                            setSelectedLocation([lat, lng]);
                                            const distance = calculateDistanceFromCenter(lat, lng);
                                            form.setValue("distance", distance);
                                          }
                                        }}
                                        value={field.value || ""}
                                      />
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">°E</span>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
                            <DialogTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full bg-muted/50 hover:bg-muted"
                              >
                                <span className="material-icons ml-2">map</span>
                                تحديد الموقع على الخريطة
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>تحديد موقع المحطة</DialogTitle>
                              </DialogHeader>
                              <div className="mb-4">
                                <p className="text-sm text-muted-foreground mb-4">
                                  اضغط على الخريطة لتحديد موقع المحطة. سيتم حساب المسافة بين المحطة والمركز تلقائياً.
                                </p>
                                <MapPicker
                                  initialLocation={selectedLocation || undefined}
                                  onLocationChange={(lat, lng) => {
                                    setSelectedLocation([lat, lng]);
                                    form.setValue("latitude", lat);
                                    form.setValue("longitude", lng);
                                    const distance = calculateDistanceFromCenter(lat, lng);
                                    form.setValue("distance", distance);
                                  }}
                                />
                              </div>
                              <div className="flex justify-end">
                                <Button onClick={() => setShowMapDialog(false)}>تم</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          {selectedLocation && (
                            <p className="text-sm text-muted-foreground text-center">
                              تم تحديد الموقع: {selectedLocation[0].toFixed(6)}°N, {selectedLocation[1].toFixed(6)}°E
                            </p>
                          )}
                        </div>
                      </div>
                    </FormItem>
                    
                    <FormField
                      control={form.control}
                      name="distance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>المسافة بين المحطة والمركز (كم)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              {...field} 
                              readOnly
                              value={selectedLocation ? calculateDistanceFromCenter(selectedLocation[0], selectedLocation[1]) : 0}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="approvalType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع الاعتماد <span className="text-destructive">*</span></FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر نوع الاعتماد" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="first-time">اعتماد أول مرة</SelectItem>
                              <SelectItem value="renewal">تجديد اعتماد</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {approvalType === "renewal" && (
                      <FormField
                        control={form.control}
                        name="certificateExpiryDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>تاريخ انتهاء الشهادة السابقة <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
                
                {/* بيانات المحطة */}
                <div>
                  <h2 className="text-xl font-heading font-bold mb-4 pb-2 border-b">بيانات المحطة</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="mixersCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>عدد الخلاطات (mixers) <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="maxCapacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>أقصى سعة للخلاطة <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="mixingType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع الخلط <span className="text-destructive">*</span></FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر نوع الخلط" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="normal">عادي</SelectItem>
                              <SelectItem value="dry">جاف</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="reportLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>لغة التقرير <span className="text-destructive">*</span></FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر لغة التقرير" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="arabic">عربي</SelectItem>
                              <SelectItem value="english">إنجليزي</SelectItem>
                              <SelectItem value="both">عربي وإنجليزي</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="representativeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم المندوب <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="representativePhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم تليفون المندوب <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="representativeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الرقم القومي للمندوب <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="qualityManagerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم مدير الجودة بالمحطة <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="qualityManagerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم تليفون مدير الجودة بالمحطة <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="qualityManagerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الرقم القومي لمدير الجودة بالمحطة <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {needsAccommodation && (
                      <FormField
                        control={form.control}
                        name="accommodation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>توفير الإقامة أثناء الزيارات الدورية <span className="text-destructive">*</span></FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر جهة توفير الإقامة" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="station">المحطة</SelectItem>
                                <SelectItem value="center">المركز</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
                
                {/* حساب الرسوم */}
                <div>
                  <h2 className="text-xl font-heading font-bold mb-4 pb-2 border-b">حساب الرسوم</h2>
                  
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <ul className="space-y-2">
                      <li className="flex justify-between">
                        <span>تكلفة المسافة:</span>
                        <span className="font-medium">{formatCurrency(fees.distanceCost)}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>تكلفة الخلاطات:</span>
                        <span className="font-medium">{formatCurrency(fees.mixersCost)}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>تكلفة الإقامة:</span>
                        <span className="font-medium">{formatCurrency(fees.accommodationCost)}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>تكلفة التقرير الإضافي:</span>
                        <span className="font-medium">{formatCurrency(fees.additionalReportCost)}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>الضريبة:</span>
                        <span className="font-medium">{formatCurrency(fees.taxCost)}</span>
                      </li>
                      <li className="flex justify-between font-bold pt-2 border-t">
                        <span>إجمالي التكلفة:</span>
                        <span className="font-medium">{formatCurrency(fees.totalCost)}</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      className="ml-4"
                      onClick={calculateFeesHandler}
                    >
                      حساب الرسوم
                    </Button>
                    <Button type="submit">
                      تقديم الطلب
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
