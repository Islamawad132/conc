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
  locked?: boolean;
}

interface VisitChecksProps {
  visitId: number;
  stationId: number;
  visitType: "first" | "second" | "additional";
  initialChecks?: VisitCheck[];
  onChecksComplete: (checks: VisitCheck[]) => void;
  visitNumber?: number;
  isCompleted?: boolean;
  failedChecks?: VisitCheckItem[];
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
  visitNumber = 1,
  isCompleted = false,
  failedChecks = []
}: VisitChecksProps) {
  const [checks, setChecks] = useState<VisitCheck[]>(() => {
    // For additional visits, only initialize failed checks from the most recent visit
    if (visitType === 'additional') {
      return checkItems
        .filter(item => failedChecks.includes(item.id)) // Only include failed checks from most recent visit
        .map(item => {
          const existingCheck = initialChecks.find(c => c.itemId === item.id);
          return {
            itemId: item.id,
            status: existingCheck?.status || 'pending',
            notes: existingCheck?.notes || "",
            locked: existingCheck?.status === 'passed' || existingCheck?.status === 'failed'
          };
        });
    }
    
    // For first visits, initialize all checks
    return initialChecks.length > 0
      ? initialChecks.map(check => ({
          ...check,
          locked: check.status === 'passed' || check.status === 'failed'
        }))
      : checkItems.map((item) => ({ 
          itemId: item.id, 
          status: 'pending', 
          notes: "",
          locked: false
        }));
  });

  const handleCheckChange = (itemId: VisitCheckItem, status: 'passed' | 'failed' | 'pending') => {
    setChecks(prev => prev.map(check => 
      check.itemId === itemId
        ? { ...check, status, locked: status === 'passed' || status === 'failed' }
        : check
    ));
  };

  const areAllChecksCompleted = () => {
    return checks.every(check => check.status === 'passed' || check.status === 'failed');
  };

  const handleSubmit = async () => {
    if (!areAllChecksCompleted()) {
      toast.error("يجب إكمال جميع الاختبارات");
      return;
    }

    try {
      const response = await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checks,
          status: "completed",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update visit checks");
      }

      toast.success("تم حفظ نتائج الاختبارات بنجاح");
      onChecksComplete(checks);
    } catch (error) {
      console.error("Error updating visit checks:", error);
      toast.error("حدث خطأ أثناء حفظ نتائج الاختبارات");
    }
  };

  // عرض نتائج الاختبارات
  const renderChecks = () => {
    // For additional visits, only show failed checks from the most recent visit
    const checksToRender = visitType === 'additional' 
      ? checks.filter(check => failedChecks.includes(check.itemId))
      : checks;

    return checksToRender.map((check) => {
      const item = checkItems.find(i => i.id === check.itemId);
      if (!item) return null;

      // If visit is completed or check is locked, show read-only results
      if (isCompleted || check.locked) {
        return (
          <div key={item.id} className="p-4 border rounded-lg bg-muted">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">{item.label}</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <div className={`px-3 py-1 rounded-full ${
                check.status === 'passed' ? 'bg-success/20 text-success' :
                check.status === 'failed' ? 'bg-destructive/20 text-destructive' :
                'bg-muted text-muted-foreground'
              }`}>
                {check.status === 'passed' ? 'ناجح' :
                 check.status === 'failed' ? 'فاشل' :
                 'تحت الاختبار'}
              </div>
            </div>
          </div>
        );
      }

      // Otherwise show editable form
      return (
        <div key={item.id} className="space-y-2">
          <Label className="text-lg font-semibold">{item.label}</Label>
          <p className="text-sm text-muted-foreground">{item.description}</p>
          <RadioGroup
            value={check.status}
            onValueChange={(value) => handleCheckChange(item.id, value as 'passed' | 'failed' | 'pending')}
            className="flex gap-4"
            disabled={check.locked}
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
      );
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {visitType === 'additional' 
            ? `نتائج الزيارة الإضافية ${visitNumber}`
            : 'نتائج الزيارة الأولى'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {renderChecks()}
        </div>
        {!isCompleted && (
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSubmit}>
              {areAllChecksCompleted() ? "تأكيد النتائج النهائية" : "حفظ النتائج"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 