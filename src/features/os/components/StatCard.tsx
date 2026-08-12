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
    <Card className="card-system">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-4">
          <p className="label-premium">{title}</p>
          <Icon className={`w-4 h-4 ${color} opacity-80`} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-kpi">{value}</span>
        </div>
      </CardContent>
    </Card>
  );
}
