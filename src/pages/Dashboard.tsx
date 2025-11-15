import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/StatsCard";
import { MaterialCard } from "@/components/MaterialCard";
import { StreakCounter } from "@/components/StreakCounter";
import { AchievementBadge } from "@/components/AchievementBadge";
import { useToast } from "@/hooks/use-toast";
import { 
  LogOut, 
  Upload, 
  Target, 
  Clock, 
  CheckCircle, 
  Flame,
  PlayCircle,
  Trophy,
  Zap,
  Award
} from "lucide-react";

interface Material {
  id: string;
  title: string;
  file_name: string;
  word_count: number;
  created_at: string;
  processing_status: string;
  totalChunks?: number;
  completedChunks?: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMaterials: 0,
    totalChunks: 0,
    completedChunks: 0,
    currentStreak: 0,
    longestStreak: 0,
  });

  useEffect(() => {
    checkAuth();
    loadDashboardData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch materials
      const { data: materialsData, error: materialsError } = await supabase
        .from("study_materials")
        .select(`
          id,
          title,
          file_name,
          word_count,
          created_at,
          processing_status
        `)
        .order("created_at", { ascending: false });

      if (materialsError) throw materialsError;

      // Fetch chunks and progress for each material
      const materialsWithProgress = await Promise.all(
        (materialsData || []).map(async (material) => {
          const { data: chunks } = await supabase
            .from("study_chunks")
            .select("id")
            .eq("material_id", material.id);

          const { data: progress } = await supabase
            .from("study_progress")
            .select("chunk_id, completed")
            .eq("completed", true)
            .in("chunk_id", chunks?.map(c => c.id) || []);

          return {
            ...material,
            totalChunks: chunks?.length || 0,
            completedChunks: progress?.length || 0,
          };
        })
      );

      setMaterials(materialsWithProgress);

      // Calculate stats
      const totalChunks = materialsWithProgress.reduce((acc, m) => acc + (m.totalChunks || 0), 0);
      const completedChunks = materialsWithProgress.reduce((acc, m) => acc + (m.completedChunks || 0), 0);

      // Calculate streak
      const { data: progressData } = await supabase
        .from("study_progress")
        .select("completed_at")
        .eq("completed", true)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });

      const streak = calculateStreak(progressData || []);

      setStats({
        totalMaterials: materialsWithProgress.length,
        totalChunks,
        completedChunks,
        currentStreak: streak.current,
        longestStreak: streak.longest,
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast({
        title: "Error loading dashboard",
        description: "Please refresh the page and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = (progressData: any[]) => {
    if (!progressData.length) return { current: 0, longest: 0 };

    const dates = progressData.map(p => new Date(p.completed_at).toDateString());
    const uniqueDates = [...new Set(dates)].sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    // Check if streak is still active
    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
      currentStreak = 1;
      
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currDate = new Date(uniqueDates[i]);
        const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / 86400000);
        
        if (diffDays === 1) {
          currentStreak++;
          tempStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    tempStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / 86400000);
      
      if (diffDays === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    return { current: currentStreak, longest: longestStreak };
  };

  const handleContinueLearning = (materialId: string) => {
    navigate(`/study?material=${materialId}`);
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      const material = materials.find(m => m.id === materialId);
      if (!material) return;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("study-materials")
        .remove([material.file_name]);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
      }

      // Delete from database (cascades to chunks and progress)
      const { error: dbError } = await supabase
        .from("study_materials")
        .delete()
        .eq("id", materialId);

      if (dbError) throw dbError;

      toast({
        title: "Material deleted",
        description: "Your study material has been removed.",
      });

      loadDashboardData();
    } catch (error) {
      console.error("Error deleting material:", error);
      toast({
        title: "Error deleting material",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getRecentDays = () => {
    // Get last 7 days of activity for streak counter
    const today = new Date();
    const days: boolean[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      // This is simplified - in production, check actual progress data
      days.push(i < stats.currentStreak);
    }
    
    return days;
  };

  const achievements = [
    {
      title: "First Chunk",
      description: "Complete your first learning chunk",
      icon: PlayCircle,
      unlocked: stats.completedChunks >= 1,
      progress: Math.min(stats.completedChunks, 1),
      total: 1,
    },
    {
      title: "Getting Started",
      description: "Complete 5 learning chunks",
      icon: Zap,
      unlocked: stats.completedChunks >= 5,
      progress: Math.min(stats.completedChunks, 5),
      total: 5,
    },
    {
      title: "Dedicated Learner",
      description: "Complete 10 learning chunks",
      icon: Trophy,
      unlocked: stats.completedChunks >= 10,
      progress: Math.min(stats.completedChunks, 10),
      total: 10,
    },
    {
      title: "3-Day Streak",
      description: "Learn for 3 consecutive days",
      icon: Flame,
      unlocked: stats.currentStreak >= 3,
      progress: Math.min(stats.currentStreak, 3),
      total: 3,
    },
    {
      title: "Week Warrior",
      description: "Maintain a 7-day learning streak",
      icon: Award,
      unlocked: stats.currentStreak >= 7,
      progress: Math.min(stats.currentStreak, 7),
      total: 7,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">MindChunk</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {user?.email?.split('@')[0]}! 👋</p>
          </div>
          <Button onClick={handleLogout} variant="ghost">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Streak Counter */}
        {stats.currentStreak > 0 && (
          <StreakCounter
            currentStreak={stats.currentStreak}
            longestStreak={stats.longestStreak}
            recentDays={getRecentDays()}
          />
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Materials"
            value={stats.totalMaterials}
            icon={Upload}
            subtitle="Study materials uploaded"
          />
          <StatsCard
            title="Sessions"
            value="3"
            icon={Target}
            subtitle="Focus sessions today"
            trend="+1 from yesterday"
          />
          <StatsCard
            title="Chunks Mastered"
            value={stats.completedChunks}
            icon={CheckCircle}
            subtitle={`of ${stats.totalChunks} total chunks`}
          />
          <StatsCard
            title="Focus Time"
            value="1h 25m"
            icon={Clock}
            subtitle="Total time today"
          />
        </div>

        {/* Materials Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Your Study Materials</h2>
            <Button onClick={() => navigate("/study")}>
              <Upload className="w-4 h-4 mr-2" />
              Upload New Material
            </Button>
          </div>

          {materials.length === 0 ? (
            <div className="text-center py-16">
              <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No study materials yet</h3>
              <p className="text-muted-foreground mb-6">
                Upload your first material to get started with chunked learning!
              </p>
              <Button onClick={() => navigate("/study")} size="lg">
                <Upload className="w-5 h-5 mr-2" />
                Upload Material
              </Button>
            </div>
          ) : (
            <div className="grid gap-6">
              {materials.map((material) => (
                <MaterialCard
                  key={material.id}
                  id={material.id}
                  title={material.title}
                  fileName={material.file_name}
                  wordCount={material.word_count}
                  createdAt={material.created_at}
                  processingStatus={material.processing_status}
                  totalChunks={material.totalChunks}
                  completedChunks={material.completedChunks}
                  progress={
                    material.totalChunks 
                      ? Math.round((material.completedChunks! / material.totalChunks) * 100)
                      : 0
                  }
                  onContinue={handleContinueLearning}
                  onDelete={handleDeleteMaterial}
                />
              ))}
            </div>
          )}
        </div>

        {/* Achievements Section */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6">Your Achievements 🏆</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement, index) => (
              <AchievementBadge
                key={index}
                title={achievement.title}
                description={achievement.description}
                icon={achievement.icon}
                unlocked={achievement.unlocked}
                progress={achievement.progress}
                total={achievement.total}
                unlockedDate={achievement.unlocked ? new Date().toISOString() : undefined}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
