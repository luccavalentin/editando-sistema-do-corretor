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
    <Card className="rounded-sm border border-border shadow-xs bg-card overflow-hidden group hover:border-border/80 transition-all">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
          <Icon className={`w-4 h-4 ${color} opacity-70`} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold font-sans tracking-tight text-foreground">{value}</span>
        </div>
      </CardContent>
    </Card>
  );
}
