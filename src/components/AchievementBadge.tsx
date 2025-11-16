import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
}

export function AchievementBadge({ achievement, unlocked }: AchievementBadgeProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg border transition-smooth",
        unlocked
          ? "border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-sm hover:shadow-md"
          : "border-border bg-muted/30 opacity-50"
      )}
    >
      <div className="flex flex-col items-center text-center space-y-3">
        <div
          className={cn(
            "text-3xl p-3 rounded-lg",
            unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          {achievement.icon}
        </div>
        <div className="space-y-1">
          <p className={cn("font-semibold text-sm", unlocked ? "text-foreground" : "text-muted-foreground")}>
            {achievement.name}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{achievement.description}</p>
        </div>
        {!unlocked && <Badge variant="secondary" className="text-xs">Locked</Badge>}
      </div>
    </div>
  );
}
