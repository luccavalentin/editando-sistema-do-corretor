import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

export function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const [prevValue, setPrevValue] = useState(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (value !== prevValue) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 1000);
      setPrevValue(value);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [value, prevValue]);

  return (
    <Card className={cn("card-system transition-all duration-500", flash && "premium-flash border-orange/30")}>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <span className="label-premium">{title}</span>
          <div className={`p-1.5 rounded bg-muted/50 ${color}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline overflow-hidden">
          <motion.span 
            key={value}
            initial={{ opacity: 0.5, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="text-kpi tabular-nums"
          >
            {value}
          </motion.span>
        </div>
      </CardContent>
    </Card>
  );
}

