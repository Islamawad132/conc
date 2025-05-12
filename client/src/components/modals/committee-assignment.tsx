import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface User {
  id: number;
  name: string;
  role: string;
  active: boolean;
}

interface CommitteeAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationId: number;
}

export function CommitteeAssignmentModal({ isOpen, onClose, stationId }: CommitteeAssignmentModalProps) {
  const [chairman, setChairman] = useState("");
  const [engineer, setEngineer] = useState("");
  const [secretary, setSecretary] = useState("");
  const queryClient = useQueryClient();

  // Fetch users from our system
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Filter users by role
  const chairmen = users.filter(user => 
    user.role === "engineer" && 
    user.active && 
    user.id.toString() !== engineer
  );
  const engineers = users.filter(user => 
    user.role === "engineer" && 
    user.active && 
    user.id.toString() !== chairman
  );
  const secretaries = users.filter(user => user.role === "secretary" && user.active);

  const { mutate: assignCommittee, isPending } = useMutation({
    mutationFn: async (data: { chairman: string; engineer: string; secretary: string }) => {
      const response = await fetch(`/api/stations/${stationId}/assign-committee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to assign committee");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stations/${stationId}`] });
      toast.success("تم تعيين اللجنة بنجاح");
      onClose();
    },
    onError: () => {
      toast.error("حدث خطأ أثناء تعيين اللجنة");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chairman || !engineer || !secretary) {
      toast.error("يرجى اختيار جميع أعضاء اللجنة");
      return;
    }

    assignCommittee({ chairman, engineer, secretary });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>تعيين اللجنة</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chairman">رئيس اللجنة</Label>
            <Select value={chairman} onValueChange={setChairman}>
              <SelectTrigger id="chairman">
                <SelectValue placeholder="اختر رئيس اللجنة" />
              </SelectTrigger>
              <SelectContent>
                {chairmen.map(user => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="engineer">المهندس</Label>
            <Select value={engineer} onValueChange={setEngineer}>
              <SelectTrigger id="engineer">
                <SelectValue placeholder="اختر المهندس" />
              </SelectTrigger>
              <SelectContent>
                {engineers.map(user => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="secretary">السكرتير</Label>
            <Select value={secretary} onValueChange={setSecretary}>
              <SelectTrigger id="secretary">
                <SelectValue placeholder="اختر السكرتير" />
              </SelectTrigger>
              <SelectContent>
                {secretaries.map(user => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending || isLoading}>
              {isPending ? "جاري التعيين..." : "تعيين اللجنة"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 