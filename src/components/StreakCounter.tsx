import { Card } from "@/components/ui/card";
import { Flame } from "lucide-react";

interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
  recentDays: boolean[]; // Last 7 days of activity
}

export function StreakCounter({ currentStreak, longestStreak, recentDays }: StreakCounterProps) {
  const getMessage = () => {
    if (currentStreak === 0) return "Start your streak today!";
    if (currentStreak === 1) return "Great start!";
    if (currentStreak === 3) return "You're building a habit!";
    if (currentStreak === 5) return "On fire! 🔥";
    if (currentStreak === 7) return "One week strong! 💪";
    if (currentStreak >= 10) return "Unstoppable! 🌟";
    return "Keep it going!";
  };

  const getFlameColor = () => {
    if (currentStreak === 0) return "text-muted-foreground";
    if (currentStreak < 3) return "text-primary";
    if (currentStreak < 7) return "text-secondary";
    return "text-destructive"; // Using destructive for orange/red flame
  };

  return (
    <Card className="p-6 gradient-primary text-primary-foreground">
      <div className="flex items-center gap-4">
        <div className={`p-3 bg-background/10 rounded-full ${currentStreak > 0 ? 'animate-pulse-glow' : ''}`}>
          <Flame className={`w-8 h-8 ${currentStreak > 0 ? 'text-primary-foreground' : 'text-primary-foreground/50'}`} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold">{currentStreak}</span>
            <span className="text-sm opacity-90">day streak</span>
          </div>
          <p className="text-sm opacity-80">{getMessage()}</p>
          {longestStreak > currentStreak && (
            <p className="text-xs opacity-70 mt-1">Best: {longestStreak} days</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {recentDays.map((active, index) => (
          <div
            key={index}
            className={`h-2 flex-1 rounded-full transition-all ${
              active ? 'bg-primary-foreground' : 'bg-background/20'
            }`}
          />
        ))}
      </div>
    </Card>
  );
}
