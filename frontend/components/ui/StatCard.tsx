import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, subValue, color, icon }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          {label}
        </p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
      {subValue && (
        <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
      )}
    </div>
  );
}

