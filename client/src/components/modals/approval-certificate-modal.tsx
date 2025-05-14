import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ApprovalCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationId: number;
  stationName: string;
}

export function ApprovalCertificateModal({ isOpen, onClose, stationId, stationName }: ApprovalCertificateModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateCertificate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/stations/${stationId}/generate-approval-certificate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ language: "ar" }) // Currently only Arabic is supported
      });

      if (!response.ok) {
        throw new Error("Failed to generate approval certificate");
      }

      // Get the PDF file from the response
      const blob = await response.blob();
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a link element
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename
      const filename = `شهادة_اعتماد_${stationName.replace(/\s+/g, '_')}.pdf`;
      link.download = filename;
      
      // Append to the document body
      document.body.appendChild(link);
      
      // Trigger the download
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("تم إنشاء شهادة الاعتماد بنجاح");
      onClose();
    } catch (error) {
      console.error("Error generating approval certificate:", error);
      toast.error("فشل في إنشاء شهادة الاعتماد");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] text-right">
        <DialogHeader>
          <DialogTitle className="text-right">إنشاء شهادة اعتماد</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-4">
            هل تريد إنشاء شهادة اعتماد لمحطة {stationName}؟
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              إلغاء
            </Button>
            <Button onClick={handleGenerateCertificate} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                "إنشاء شهادة الاعتماد"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 