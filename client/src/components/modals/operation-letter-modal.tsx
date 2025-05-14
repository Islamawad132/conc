import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface OperationLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationId: number;
  stationName: string;
}

export function OperationLetterModal({ isOpen, onClose, stationId, stationName }: OperationLetterModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<"ar" | "en">("ar");

  const handleGenerateLetter = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/stations/${stationId}/generate-operation-letter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ language })
      });

      if (!response.ok) {
        throw new Error("Failed to generate operation letter");
      }

      // Get the PDF file from the response
      const blob = await response.blob();
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a link element
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename based on language
      const filename = language === "ar" 
        ? `خطاب_تشغيل_${stationName.replace(/\s+/g, '_')}.pdf`
        : `Operation_Letter_${stationName.replace(/\s+/g, '_')}.pdf`;
      
      link.download = filename;
      
      // Append to the document body
      document.body.appendChild(link);
      
      // Trigger the download
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("تم إنشاء خطاب التشغيل بنجاح");
      onClose();
    } catch (error) {
      console.error("Error generating operation letter:", error);
      toast.error("حدث خطأ أثناء إنشاء خطاب التشغيل");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>إنشاء خطاب تشغيل</DialogTitle>
          <DialogDescription>
            اختر لغة خطاب التشغيل للمحطة "{stationName}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Label className="text-base">اختر لغة الخطاب</Label>
          <RadioGroup
            value={language}
            onValueChange={(value) => setLanguage(value as "ar" | "en")}
            className="flex flex-col space-y-2 mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ar" id="ar" />
              <Label htmlFor="ar" className="font-medium">العربية</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="en" id="en" />
              <Label htmlFor="en" className="font-medium">English</Label>
            </div>
          </RadioGroup>
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            إلغاء
          </Button>
          <Button type="button" onClick={handleGenerateLetter} disabled={isLoading}>
            {isLoading ? "جاري الإنشاء..." : "إنشاء الخطاب"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 