import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface VisitScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationId: number;
  onSuccess: () => void;
}

export function VisitScheduleModal({ isOpen, onClose, stationId, onSuccess }: VisitScheduleModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitType, setVisitType] = useState<"first" | "additional">("first");
  const [hasExistingVisits, setHasExistingVisits] = useState(false);

  useEffect(() => {
    const checkExistingVisits = async () => {
      try {
        const response = await fetch(`/api/stations/${stationId}/visits`);
        if (!response.ok) {
          throw new Error("Failed to fetch visits");
        }
        const visits = await response.json();
        setHasExistingVisits(visits.length > 0);
        
        // If no existing visits, force visit type to be "first"
        if (visits.length === 0) {
          setVisitType("first");
        }
      } catch (error) {
        console.error("Error checking existing visits:", error);
        toast.error("حدث خطأ أثناء التحقق من الزيارات السابقة");
      }
    };

    if (isOpen) {
      checkExistingVisits();
    }
  }, [isOpen, stationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create a Date object from the input date
      const date = new Date(visitDate);
      date.setHours(0, 0, 0, 0); // Set time to midnight

      const response = await fetch(`/api/visits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stationId,
          visitDate: date.toISOString(),
          visitTime: "09:00", // Default to 9 AM
          visitType,
          status: "scheduled",
          committee: [], // This will be populated by the server
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to schedule visit");
      }

      toast.success("تم جدولة الزيارة بنجاح");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error scheduling visit:", error);
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء جدولة الزيارة");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>جدولة زيارة جديدة</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visitType">نوع الزيارة</Label>
            <Select
              value={visitType}
              onValueChange={(value: "first" | "additional") => setVisitType(value)}
              disabled={!hasExistingVisits}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع الزيارة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first">زيارة أولى</SelectItem>
                {hasExistingVisits && (
                  <SelectItem value="additional">زيارة إضافية</SelectItem>
                )}
              </SelectContent>
            </Select>
            {!hasExistingVisits && (
              <p className="text-sm text-muted-foreground">
                يجب أن تكون الزيارة الأولى زيارة أولى
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="visitDate">تاريخ الزيارة</Label>
            <Input
              id="visitDate"
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "جاري الجدولة..." : "جدولة الزيارة"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 