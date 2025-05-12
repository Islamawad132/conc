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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

// Define user schema
const userSchema = z.object({
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  name: z.string().min(1, "يرجى إدخال الاسم"),
  role: z.enum(["admin", "secretary", "engineer", "client", "chairman"]),
  email: z.string().email("يرجى إدخال بريد إلكتروني صحيح"),
  phone: z.string().min(10, "يرجى إدخال رقم هاتف صحيح"),
});

type UserFormValues = z.infer<typeof userSchema>;

interface User {
  id: number;
  username: string;
  name: string;
  role: "admin" | "secretary" | "engineer" | "client" | "chairman";
  email: string;
  phone: string;
  active: boolean;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fee settings form
  const feeSettingsForm = useForm<z.infer<typeof feeSettingsSchema>>({
    resolver: zodResolver(feeSettingsSchema),
    defaultValues: initialFeeSettings,
  });
  const onFeeSettingsSubmit = (data: z.infer<typeof feeSettingsSchema>) => {
    toast({
      title: "تم حفظ الإعدادات",
      description: "تم تحديث إعدادات الرسوم بنجاح",
    });
  };

  // Approval types state and form
  const [approvalTypesList, setApprovalTypesList] = useState(approvalTypes);
  const approvalTypeForm = useForm<z.infer<typeof approvalTypeSchema>>({
    resolver: zodResolver(approvalTypeSchema),
    defaultValues: { name: "" },
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

  // Mixing types state and form
  const [mixingTypesList, setMixingTypesList] = useState(mixingTypes);
  const mixingTypeForm = useForm<z.infer<typeof mixingTypeSchema>>({
    resolver: zodResolver(mixingTypeSchema),
    defaultValues: { name: "" },
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

  // Users fetch and mutations (as previously implemented)
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  const { mutate: addUser, isPending: isAddingUser } = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error occurred" }));
        throw new Error(errorData.message || "Failed to add user");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "تم إضافة المستخدم بنجاح" });
      setIsAddUserDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Error adding user:", error);
      toast({ 
        title: "حدث خطأ أثناء إضافة المستخدم", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
  const { mutate: toggleUserStatus } = useMutation({
    mutationFn: async ({ userId, active }: { userId: number; active: boolean }) => {
      const response = await fetch(`/api/users/${userId}/toggle-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!response.ok) throw new Error("Failed to update user status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "تم تحديث حالة المستخدم بنجاح" });
    },
    onError: () => {
      toast({ title: "حدث خطأ أثناء تحديث حالة المستخدم", variant: "destructive" });
    },
  });
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      role: "client",
      email: "",
      phone: "",
    },
  });
  const onSubmit = (data: UserFormValues) => {
    addUser(data);
  };

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

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-grow p-6 overflow-auto">
        <PageHeader title="الإعدادات" description="إدارة إعدادات النظام" />
        <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="users">إدارة المستخدمين</TabsTrigger>
            <TabsTrigger value="fees">إعدادات الرسوم</TabsTrigger>
            <TabsTrigger value="approval-types">أنواع الاعتماد</TabsTrigger>
            <TabsTrigger value="mixing-types">أنواع الخلط</TabsTrigger>
          </TabsList>
          {/* Users Management Tab */}
          <TabsContent value="users">
            <Card className="shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6 pb-2 border-b">
                  <h2 className="text-xl font-heading font-bold">إدارة المستخدمين</h2>
                  <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <span className="material-icons ml-1">person_add</span>
                        إضافة مستخدم
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>إضافة مستخدم جديد</DialogTitle>
                      </DialogHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>اسم المستخدم</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>كلمة المرور</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>الاسم</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>الدور</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="اختر الدور" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="admin">مسؤول النظام</SelectItem>
                                    <SelectItem value="secretary">سكرتير</SelectItem>
                                    <SelectItem value="engineer">مهندس</SelectItem>
                                    <SelectItem value="chairman">رئيس لجنة</SelectItem>
                                    <SelectItem value="client">عميل</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>البريد الإلكتروني</FormLabel>
                                <FormControl>
                                  <Input type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>رقم الهاتف</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                              إلغاء
                            </Button>
                            <Button type="submit" disabled={isAddingUser}>
                              {isAddingUser ? "جاري الإضافة..." : "إضافة"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-muted border-b">
                        <th className="py-3 px-4 text-right font-medium">اسم المستخدم</th>
                        <th className="py-3 px-4 text-right font-medium">الاسم</th>
                        <th className="py-3 px-4 text-right font-medium">الدور</th>
                        <th className="py-3 px-4 text-right font-medium">البريد الإلكتروني</th>
                        <th className="py-3 px-4 text-right font-medium">رقم الهاتف</th>
                        <th className="py-3 px-4 text-right font-medium">الحالة</th>
                        <th className="py-3 px-4 text-right font-medium">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={7} className="py-4 text-center">جاري التحميل...</td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-4 text-center">لا يوجد مستخدمين</td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-4">{user.username}</td>
                            <td className="py-3 px-4">{user.name}</td>
                            <td className="py-3 px-4">
                              {user.role === "admin" && "مسؤول النظام"}
                              {user.role === "secretary" && "سكرتير"}
                              {user.role === "engineer" && "مهندس"}
                              {user.role === "chairman" && "رئيس لجنة"}
                              {user.role === "client" && "عميل"}
                            </td>
                            <td className="py-3 px-4">{user.email}</td>
                            <td className="py-3 px-4">{user.phone}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                user.active 
                                  ? "bg-success/10 text-success" 
                                  : "bg-destructive/10 text-destructive"
                              }`}>
                                {user.active ? "نشط" : "محظور"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2 space-x-reverse">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-primary"
                                  onClick={() => {
                                    // TODO: Implement edit user functionality
                                    toast({
                                      title: "سيتم إضافة هذه الميزة قريباً",
                                    });
                                  }}
                                >
                                  <span className="material-icons">edit</span>
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className={user.active ? "text-warning" : "text-success"}
                                  onClick={() => toggleUserStatus({ 
                                    userId: user.id, 
                                    active: !user.active 
                                  })}
                                >
                                  <span className="material-icons">
                                    {user.active ? "block" : "check_circle"}
                                  </span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
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
        </Tabs>
      </main>
    </div>
  );
}
