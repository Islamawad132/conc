import { useState, useEffect } from "react";
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

interface CommitteeMember {
  id: number;
  name: string;
  role: string;
  phone?: string;
}

interface Station {
  id: number;
  committee?: CommitteeMember[];
  // other station properties...
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
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Fetch users from our system
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch station data to get existing committee
  const { data: station, isLoading: stationLoading } = useQuery<Station>({
    queryKey: [`/api/stations/${stationId}`],
    enabled: isOpen,
  });

  // Initialize with existing committee members if they exist
  useEffect(() => {
    if (station?.committee && station.committee.length > 0) {
      const chairmanMember = station.committee.find(m => m.role === "chairman");
      const engineerMember = station.committee.find(m => m.role === "engineer");
      const secretaryMember = station.committee.find(m => m.role === "secretary");
      
      if (chairmanMember) setChairman(chairmanMember.id.toString());
      if (engineerMember) setEngineer(engineerMember.id.toString());
      if (secretaryMember) setSecretary(secretaryMember.id.toString());
    }
  }, [station]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chairman || !engineer || !secretary) {
      toast.error("يرجى اختيار جميع أعضاء اللجنة");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/stations/${stationId}/assign-committee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chairman: chairman,
          engineer: engineer,
          secretary: secretary,
          includePhones: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign committee");
      }

      // Invalidate the station query to refresh data
      queryClient.invalidateQueries();
      toast.success("تم تعيين اللجنة بنجاح");
      onClose();
    } catch (error) {
      console.error("Error assigning committee:", error);
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء تعيين اللجنة");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {station?.committee && station.committee.length > 0 ? "تعديل اللجنة" : "تعيين اللجنة"}
          </DialogTitle>
        </DialogHeader>
        {(usersLoading || stationLoading) ? (
          <div className="flex justify-center p-4">
            <p>جاري التحميل...</p>
          </div>
        ) : (
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
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "جاري التعيين..." : (station?.committee && station.committee.length > 0 ? "تعديل اللجنة" : "تعيين اللجنة")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
} 