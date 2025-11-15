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
    <Card className={`p-4 transition-smooth ${
      unlocked 
        ? 'bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20' 
        : 'bg-muted/50 opacity-60'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          unlocked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm text-foreground">{title}</h4>
            {unlocked && <Badge variant="secondary" className="text-xs">Unlocked</Badge>}
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
