import { cn } from "@/lib/utils";
import { StationStatus, stationStatusNames, stationStatusColors } from "@/lib/utils";

interface StatusBadgeProps {
  status: StationStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const color = stationStatusColors[status];
  
  return (
    <span 
      className={cn(
        "px-2 py-1 rounded-full text-xs inline-flex items-center justify-center",
        `bg-${color}/10 text-${color}`,
        className
      )}
    >
      {stationStatusNames[status]}
    </span>
  );
}
