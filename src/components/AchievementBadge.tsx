import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface AchievementBadgeProps {
  title: string;
  description: string;
  icon: LucideIcon;
  unlocked: boolean;
  progress?: number;
  total?: number;
  unlockedDate?: string;
}

export function AchievementBadge({
  title,
  description,
  icon: Icon,
  unlocked,
  progress,
  total,
  unlockedDate,
}: AchievementBadgeProps) {
  return (
    <Card className={`p-4 transition-brutal ${
      unlocked 
        ? 'bg-gradient-to-br from-primary/20 to-secondary/20 border-4 border-primary shadow-brutal-sm' 
        : 'bg-muted/50 opacity-60 border-2 border-border'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`p-3 rounded-xl border-4 ${
          unlocked ? 'bg-primary border-foreground text-primary-foreground' : 'bg-muted border-muted-foreground/20 text-muted-foreground'
        }`}>
          <Icon className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-base tracking-tight text-foreground">{title}</h4>
            {unlocked && <Badge variant="secondary" className="text-xs font-bold">Unlocked</Badge>}
          </div>
          
          <p className="text-xs text-muted-foreground mb-2">{description}</p>
          
          {!unlocked && progress !== undefined && total !== undefined && (
            <p className="text-xs text-muted-foreground">
              Progress: {progress}/{total}
            </p>
          )}
          
          {unlocked && unlockedDate && (
            <p className="text-xs text-primary">
              Earned {new Date(unlockedDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
