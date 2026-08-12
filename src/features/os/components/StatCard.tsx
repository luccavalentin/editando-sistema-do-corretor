import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

export function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card className="rounded border border-border bg-card p-0 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</span>
          <div className={`p-2 rounded-md bg-muted/50 ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline">
          <span className="text-kpi">{value}</span>
        </div>
      </CardContent>
    </Card>
  );
}

