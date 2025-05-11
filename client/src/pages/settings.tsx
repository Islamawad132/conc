import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import PageHeader from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";

// Define fee settings schema
const feeSettingsSchema = z.object({
  distanceRate: z.coerce.number().min(0, "المعدل يجب أن يكون أكبر من أو يساوي صفر"),
  mixerRate: z.coerce.number().min(0, "المعدل يجب أن يكون أكبر من أو يساوي صفر"),
  accommodationCost: z.coerce.number().min(0, "التكلفة يجب أن تكون أكبر من أو يساوي صفر"),
  additionalReportRate: z.coerce.number().min(0, "المعدل يجب أن يكون أكبر من أو يساوي صفر").max(1, "المعدل يجب أن يكون أقل من أو يساوي 1"),
  taxRate: z.coerce.number().min(0, "معدل الضريبة يجب أن يكون أكبر من أو يساوي صفر").max(1, "معدل الضريبة يجب أن يكون أقل من أو يساوي 1"),
});

// Define approval types schema
const approvalTypeSchema = z.object({
  name: z.string().min(1, "يرجى إدخال اسم نوع الاعتماد"),
});

// Define mixing types schema
const mixingTypeSchema = z.object({
  name: z.string().min(1, "يرجى إدخال اسم نوع الخلط"),
});

// Mock data for settings
const initialFeeSettings = {
  distanceRate: 15, // EGP per km
  mixerRate: 1000, // EGP per mixer
  accommodationCost: 1000, // EGP if center provides accommodation
  additionalReportRate: 0.05, // 5% additional for extra language report
  taxRate: 0.14, // 14% tax
};

const approvalTypes = [
  { id: "1", name: "اعتماد أول مرة" },
  { id: "2", name: "تجديد اعتماد" },
];

const mixingTypes = [
  { id: "1", name: "عادي" },
  { id: "2", name: "جاف" },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("fees");
  const [approvalTypesList, setApprovalTypesList] = useState(approvalTypes);
  const [mixingTypesList, setMixingTypesList] = useState(mixingTypes);
  
  // Only admin can access settings
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-grow p-6 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">غير مصرح بالوصول</h2>
              <p className="text-muted-foreground">ليس لديك صلاحية للوصول إلى صفحة الإعدادات</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Fee Settings Form
  const feeSettingsForm = useForm<z.infer<typeof feeSettingsSchema>>({
    resolver: zodResolver(feeSettingsSchema),
    defaultValues: initialFeeSettings,
  });

  const onFeeSettingsSubmit = (data: z.infer<typeof feeSettingsSchema>) => {
    console.log("Fee Settings:", data);
    toast({
      title: "تم حفظ الإعدادات",
      description: "تم تحديث إعدادات الرسوم بنجاح",
    });
  };

  // Approval Type Form
  const approvalTypeForm = useForm<z.infer<typeof approvalTypeSchema>>({
    resolver: zodResolver(approvalTypeSchema),
    defaultValues: {
      name: "",
    },
  });

  const onApprovalTypeSubmit = (data: z.infer<typeof approvalTypeSchema>) => {
    const newType = {
      id: (approvalTypesList.length + 1).toString(),
      name: data.name,
    };
    setApprovalTypesList([...approvalTypesList, newType]);
    approvalTypeForm.reset();
    toast({
      title: "تم الإضافة",
      description: `تمت إضافة نوع الاعتماد "${data.name}" بنجاح`,
    });
  };

  const deleteApprovalType = (id: string) => {
    setApprovalTypesList(approvalTypesList.filter(type => type.id !== id));
    toast({
      title: "تم الحذف",
      description: "تم حذف نوع الاعتماد بنجاح",
    });
  };

  // Mixing Type Form
  const mixingTypeForm = useForm<z.infer<typeof mixingTypeSchema>>({
    resolver: zodResolver(mixingTypeSchema),
    defaultValues: {
      name: "",
    },
  });

  const onMixingTypeSubmit = (data: z.infer<typeof mixingTypeSchema>) => {
    const newType = {
      id: (mixingTypesList.length + 1).toString(),
      name: data.name,
    };
    setMixingTypesList([...mixingTypesList, newType]);
    mixingTypeForm.reset();
    toast({
      title: "تم الإضافة",
      description: `تمت إضافة نوع الخلط "${data.name}" بنجاح`,
    });
  };

  const deleteMixingType = (id: string) => {
    setMixingTypesList(mixingTypesList.filter(type => type.id !== id));
    toast({
      title: "تم الحذف",
      description: "تم حذف نوع الخلط بنجاح",
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-grow p-6 overflow-auto">
        <PageHeader 
          title="الإعدادات" 
          description="إدارة إعدادات النظام"
        />
        
        <Tabs defaultValue="fees" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="fees">إعدادات الرسوم</TabsTrigger>
            <TabsTrigger value="approval-types">أنواع الاعتماد</TabsTrigger>
            <TabsTrigger value="mixing-types">أنواع الخلط</TabsTrigger>
            <TabsTrigger value="users">إدارة المستخدمين</TabsTrigger>
          </TabsList>
          
          {/* Fee Settings Tab */}
          <TabsContent value="fees">
            <Card className="shadow">
              <CardContent className="p-6">
                <h2 className="text-xl font-heading font-bold mb-6 pb-2 border-b">إعدادات حساب الرسوم</h2>
                
                <Form {...feeSettingsForm}>
                  <form onSubmit={feeSettingsForm.handleSubmit(onFeeSettingsSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={feeSettingsForm.control}
                        name="distanceRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>معدل تكلفة المسافة (جنيه/كم)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={feeSettingsForm.control}
                        name="mixerRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>تكلفة الخلاطة الواحدة (جنيه)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={feeSettingsForm.control}
                        name="accommodationCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>تكلفة الإقامة (جنيه)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={feeSettingsForm.control}
                        name="additionalReportRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>معدل تكلفة التقرير الإضافي (نسبة)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                min="0" 
                                max="1" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={feeSettingsForm.control}
                        name="taxRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>معدل الضريبة (نسبة)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                min="0" 
                                max="1" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <Button type="submit">حفظ الإعدادات</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Approval Types Tab */}
          <TabsContent value="approval-types">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card className="shadow">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-heading font-bold mb-6 pb-2 border-b">أنواع الاعتماد</h2>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-muted border-b">
                            <th className="py-3 px-4 text-right font-medium">الاسم</th>
                            <th className="py-3 px-4 text-right font-medium">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {approvalTypesList.map((type) => (
                            <tr key={type.id} className="border-b hover:bg-muted/50 transition-colors">
                              <td className="py-3 px-4">{type.name}</td>
                              <td className="py-3 px-4">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive"
                                  onClick={() => deleteApprovalType(type.id)}
                                  disabled={approvalTypesList.length <= 1}
                                >
                                  <span className="material-icons">delete</span>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card className="shadow">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-heading font-bold mb-6 pb-2 border-b">إضافة نوع اعتماد جديد</h2>
                    
                    <Form {...approvalTypeForm}>
                      <form onSubmit={approvalTypeForm.handleSubmit(onApprovalTypeSubmit)} className="space-y-6">
                        <FormField
                          control={approvalTypeForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>اسم نوع الاعتماد</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button type="submit" className="w-full">إضافة</Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Mixing Types Tab */}
          <TabsContent value="mixing-types">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card className="shadow">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-heading font-bold mb-6 pb-2 border-b">أنواع الخلط</h2>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-muted border-b">
                            <th className="py-3 px-4 text-right font-medium">الاسم</th>
                            <th className="py-3 px-4 text-right font-medium">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mixingTypesList.map((type) => (
                            <tr key={type.id} className="border-b hover:bg-muted/50 transition-colors">
                              <td className="py-3 px-4">{type.name}</td>
                              <td className="py-3 px-4">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive"
                                  onClick={() => deleteMixingType(type.id)}
                                  disabled={mixingTypesList.length <= 1}
                                >
                                  <span className="material-icons">delete</span>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card className="shadow">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-heading font-bold mb-6 pb-2 border-b">إضافة نوع خلط جديد</h2>
                    
                    <Form {...mixingTypeForm}>
                      <form onSubmit={mixingTypeForm.handleSubmit(onMixingTypeSubmit)} className="space-y-6">
                        <FormField
                          control={mixingTypeForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>اسم نوع الخلط</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button type="submit" className="w-full">إضافة</Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Users Management Tab */}
          <TabsContent value="users">
            <Card className="shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6 pb-2 border-b">
                  <h2 className="text-xl font-heading font-bold">إدارة المستخدمين</h2>
                  <Button>
                    <span className="material-icons ml-1">person_add</span>
                    إضافة مستخدم
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-muted border-b">
                        <th className="py-3 px-4 text-right font-medium">اسم المستخدم</th>
                        <th className="py-3 px-4 text-right font-medium">الدور</th>
                        <th className="py-3 px-4 text-right font-medium">البريد الإلكتروني</th>
                        <th className="py-3 px-4 text-right font-medium">الحالة</th>
                        <th className="py-3 px-4 text-right font-medium">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4">أحمد محمد</td>
                        <td className="py-3 px-4">مسؤول النظام</td>
                        <td className="py-3 px-4">ahmed@example.com</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-success/10 text-success rounded-full text-xs">نشط</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2 space-x-reverse">
                            <Button variant="ghost" size="icon" className="text-primary">
                              <span className="material-icons">edit</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="text-warning">
                              <span className="material-icons">block</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4">سارة أحمد</td>
                        <td className="py-3 px-4">سكرتير</td>
                        <td className="py-3 px-4">sara@example.com</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-success/10 text-success rounded-full text-xs">نشط</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2 space-x-reverse">
                            <Button variant="ghost" size="icon" className="text-primary">
                              <span className="material-icons">edit</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="text-warning">
                              <span className="material-icons">block</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4">محمد عبد الله</td>
                        <td className="py-3 px-4">مهندس</td>
                        <td className="py-3 px-4">mohamed@example.com</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-success/10 text-success rounded-full text-xs">نشط</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2 space-x-reverse">
                            <Button variant="ghost" size="icon" className="text-primary">
                              <span className="material-icons">edit</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="text-warning">
                              <span className="material-icons">block</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4">خالد علي</td>
                        <td className="py-3 px-4">عميل</td>
                        <td className="py-3 px-4">khaled@example.com</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-destructive/10 text-destructive rounded-full text-xs">محظور</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2 space-x-reverse">
                            <Button variant="ghost" size="icon" className="text-primary">
                              <span className="material-icons">edit</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="text-success">
                              <span className="material-icons">check_circle</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
