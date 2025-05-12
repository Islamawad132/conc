import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { VisitCheckItem } from "@/lib/utils";
import { toast } from "sonner";

interface VisitCheck {
  itemId: VisitCheckItem;
  status: 'passed' | 'failed' | 'pending';
  notes: string;
}

interface VisitChecksProps {
  visitId: number;
  stationId: number;
  visitType: "first" | "second" | "additional";
  initialChecks?: VisitCheck[];
  onChecksComplete: (checks: VisitCheck[]) => void;
}

const checkItems: Array<{
  id: VisitCheckItem;
  label: string;
  description: string;
}> = [
  {
    id: "scale-calibration",
    label: "معايرة الموازين",
    description: "الانتهاء من معايرة الموازين",
  },
  {
    id: "press-calibration",
    label: "معايرة ماكينة اختبار الضغط",
    description: "الانتهاء من معايرة ماكينة اختبار الضغط",
  },
  {
    id: "uniformity-tests",
    label: "اختبارات التجانس",
    description: "الانتهاء من اختبارات التجانس",
  },
  {
    id: "chloride-sulfate-tests",
    label: "اختبارات الكلوريدات والكبريتات",
    description: "اختبارات محتوى الكلوريدات والكبريتات تفى بحدود الكود المصرى",
  },
  {
    id: "water-chemical-tests",
    label: "الاختبارات الكيميائية للماء",
    description: "الاختبارات الكيميائية للماء تفى بحدود الكود المصرى",
  },
  {
    id: "7day-compression-strength",
    label: "مقاومة الضغط عند 7 أيام",
    description: "مقاومة الضغط الخرسانة عند عمر 7 أيام تفى بالمقاومة المطلوبة",
  },
  {
    id: "28day-compression-strength",
    label: "مقاومة الضغط عند 28 يوم",
    description: "مقاومة الضغط الخرسانة عند عمر 28 أيام تفى بالمقاومة المطلوبة",
  },
];

export function VisitChecks({
  visitId,
  stationId,
  visitType,
  initialChecks = [],
  onChecksComplete,
}: VisitChecksProps) {
  const [checks, setChecks] = useState<VisitCheck[]>(
    initialChecks.length > 0
      ? initialChecks
      : checkItems.map((item) => ({ itemId: item.id, status: 'pending', notes: "" }))
  );

  const handleCheckChange = (itemId: VisitCheckItem, status: 'passed' | 'failed' | 'pending') => {
    setChecks((prev) =>
      prev.map((check) => (check.itemId === itemId ? { ...check, status } : check))
    );
  };

  const handleSubmit = async () => {
    try {
      // منطق تحديد حالة الطلب بناءً على النتائج
      const statuses = checks.map(c => c.status);
      let stationStatus = "";
      let visitStatus = "completed";
      // إذا أي تجربة تحت الاختبار
      if (statuses.includes('pending')) {
        stationStatus = "جاري العمل على الإختبارات";
      } else if (statuses.includes('failed')) {
        stationStatus = "تم رفض الإعتماد";
      } else {
        // كل التجارب من 1 إلى 6 ناجحة
        const first6 = checks.slice(0, 6).every(c => c.status === 'passed');
        const all7 = checks.length === 7 && checks.every(c => c.status === 'passed');
        if (all7) {
          stationStatus = "تم اعتماد المحطة";
        } else if (first6) {
          stationStatus = "يمكن للمحطة استخراج خطاب تشغيل";
        }
      }
      // تحديث نتائج الزيارة وحالة المحطة
      const response = await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checks,
          status: visitStatus,
          stationStatus,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to update visit checks");
      }
      onChecksComplete(checks);
      toast.success("تم تحديث نتائج الزيارة بنجاح");
    } catch (error) {
      console.error("Error updating visit checks:", error);
      toast.error("حدث خطأ أثناء تحديث نتائج الزيارة");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>نتائج الزيارة</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {checkItems.map((item) => (
            <div key={item.id} className="space-y-2">
              <Label className="text-lg font-semibold">{item.label}</Label>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <RadioGroup
                value={checks.find((c) => c.itemId === item.id)?.status || 'pending'}
                onValueChange={(value) => handleCheckChange(item.id, value as 'passed' | 'failed' | 'pending')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="passed" id={`${item.id}-passed`} />
                  <Label htmlFor={`${item.id}-passed`}>ناجح</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="failed" id={`${item.id}-failed`} />
                  <Label htmlFor={`${item.id}-failed`}>فاشل</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pending" id={`${item.id}-pending`} />
                  <Label htmlFor={`${item.id}-pending`}>تحت الاختبار</Label>
                </div>
              </RadioGroup>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSubmit}>تأكيد النتائج</Button>
        </div>
      </CardContent>
    </Card>
  );
} 