import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, Settings, Clock, Coffee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FocusTimerProps {
  compact?: boolean;
  onTimerComplete?: () => void;
}

export function FocusTimer({ compact = false, onTimerComplete }: FocusTimerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5 * 60); // 5 minutes default
  const [focusDuration, setFocusDuration] = useState(5);
  const [breakDuration, setBreakDuration] = useState(5);
  const [isBreak, setIsBreak] = useState(false);
  const [autoStartBreaks, setAutoStartBreaks] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load settings from localStorage
    const savedFocus = localStorage.getItem('focusDuration');
    const savedBreak = localStorage.getItem('breakDuration');
    const savedAutoStart = localStorage.getItem('autoStartBreaks');
    
    if (savedFocus) setFocusDuration(parseInt(savedFocus));
    if (savedBreak) setBreakDuration(parseInt(savedBreak));
    if (savedAutoStart !== null) setAutoStartBreaks(savedAutoStart === 'true');
  }, []);

  useEffect(() => {
    // Save settings to localStorage
    localStorage.setItem('focusDuration', focusDuration.toString());
    localStorage.setItem('breakDuration', breakDuration.toString());
    localStorage.setItem('autoStartBreaks', autoStartBreaks.toString());
  }, [focusDuration, breakDuration, autoStartBreaks]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    
    if (!isBreak) {
      toast({
        title: "Focus session complete! 🎉",
        description: "Great work! Time for a break.",
      });
      
      if (autoStartBreaks) {
        setIsBreak(true);
        setTimeLeft(breakDuration * 60);
        setTimeout(() => setIsRunning(true), 1000);
      }
      
      if (onTimerComplete) onTimerComplete();
    } else {
      toast({
        title: "Break complete! ☕",
        description: "Ready to focus again?",
      });
      setIsBreak(false);
      setTimeLeft(focusDuration * 60);
    }
  };

  const startTimer = (preset?: number) => {
    if (preset) {
      setFocusDuration(preset);
      setTimeLeft(preset * 60);
    } else if (!isRunning) {
      setTimeLeft(focusDuration * 60);
    }
    setIsBreak(false);
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(focusDuration * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = isBreak
    ? ((breakDuration * 60 - timeLeft) / (breakDuration * 60)) * 100
    : ((focusDuration * 60 - timeLeft) / (focusDuration * 60)) * 100;

  const getMessage = () => {
    if (isBreak) return "Break Time ☕";
    if (progress < 25) return "You've got this! Let's focus 💪";
    if (progress < 50) return "Great start! Keep the momentum 🌟";
    if (progress < 75) return "Halfway there! You're doing amazing 🎯";
    if (progress < 90) return "Almost done! Finish strong 🔥";
    return "Final moments! You've got this! ⚡";
  };

  // Compact floating widget
  if (compact && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-20 right-4 z-40 bg-card border border-border rounded-full shadow-soft p-4 hover:shadow-glow transition-smooth"
      >
        <div className="relative w-12 h-12">
          <svg className="transform -rotate-90 w-12 h-12">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="hsl(var(--muted))"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
              className="transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-bold text-foreground">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Focus Timer</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!showSettings ? (
            <>
              {/* Timer Display */}
              <div className="flex flex-col items-center py-6">
                <div className="relative w-48 h-48">
                  <svg className="transform -rotate-90 w-48 h-48">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="hsl(var(--muted))"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke={isBreak ? "hsl(var(--secondary))" : "hsl(var(--primary))"}
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 88}`}
                      strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                      className="transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-foreground">{formatTime(timeLeft)}</span>
                    <span className="text-sm text-muted-foreground mt-1">
                      {isBreak ? <Coffee className="w-4 h-4 inline" /> : <Clock className="w-4 h-4 inline" />}
                      {' '}{isBreak ? 'Break' : 'Focus'}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-center text-muted-foreground mt-4 max-w-xs">
                  {getMessage()}
                </p>
              </div>

              {/* Preset Buttons */}
              {!isRunning && !isBreak && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => startTimer(5)}
                  >
                    5 min
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => startTimer(15)}
                  >
                    15 min
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => startTimer(25)}
                  >
                    25 min
                  </Button>
                </div>
              )}

              {/* Controls */}
              <div className="flex gap-2">
                {!isRunning ? (
                  <Button onClick={() => startTimer()} className="flex-1">
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </Button>
                ) : (
                  <Button onClick={pauseTimer} variant="secondary" className="flex-1">
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                )}
                <Button onClick={resetTimer} variant="outline">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            /* Settings Panel */
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Focus Duration: {focusDuration} minutes</Label>
                <Slider
                  value={[focusDuration]}
                  onValueChange={([value]) => setFocusDuration(value)}
                  min={5}
                  max={60}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <Label>Break Duration: {breakDuration} minutes</Label>
                <Slider
                  value={[breakDuration]}
                  onValueChange={([value]) => setBreakDuration(value)}
                  min={3}
                  max={15}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-break">Auto-start breaks</Label>
                <Switch
                  id="auto-break"
                  checked={autoStartBreaks}
                  onCheckedChange={setAutoStartBreaks}
                />
              </div>

              <Button onClick={() => setShowSettings(false)} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
