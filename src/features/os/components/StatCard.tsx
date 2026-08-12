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
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-between items-start">
          <span className="label-premium">{title}</span>
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

