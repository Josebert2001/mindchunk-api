import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  trend?: string;
}

export function StatsCard({ title, value, icon: Icon, subtitle, trend }: StatsCardProps) {
  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
          <p className="text-5xl font-black tracking-tighter text-foreground mb-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && <p className="text-xs font-bold text-secondary mt-2">{trend}</p>}
        </div>
        <div className="bg-primary p-4 rounded-xl border-4 border-foreground shadow-brutal-sm">
          <Icon className="w-8 h-8 text-primary-foreground" />
        </div>
      </div>
    </Card>
  );
}
