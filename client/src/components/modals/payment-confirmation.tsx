import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationId: number;
}

export function PaymentConfirmationModal({ isOpen, onClose, stationId }: PaymentConfirmationModalProps) {
  const [referenceNumber, setReferenceNumber] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const { mutate: confirmPayment, isPending } = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/stations/${stationId}/confirm-payment`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Failed to confirm payment");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stations/${stationId}`] });
      toast.success("تم تأكيد الدفع بنجاح");
      onClose();
    },
    onError: () => {
      toast.error("حدث خطأ أثناء تأكيد الدفع");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentProof) {
      toast.error("يرجى رفع إثبات الدفع");
      return;
    }

    const formData = new FormData();
    formData.append("referenceNumber", referenceNumber);
    formData.append("referenceDate", referenceDate);
    formData.append("paymentProof", paymentProof);

    confirmPayment(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>تأكيد الدفع</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">رقم خطاب الوارد</Label>
            <Input
              id="referenceNumber"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="referenceDate">تاريخ توريد الخطاب</Label>
            <Input
              id="referenceDate"
              type="date"
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="paymentProof">إثبات الدفع</Label>
            <Input
              id="paymentProof"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
              required
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "جاري التأكيد..." : "تأكيد الدفع"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 