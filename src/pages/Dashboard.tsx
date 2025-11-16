import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
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
  Award,
  BookOpen
} from "lucide-react";

interface Material {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  word_count: number | null;
  estimated_read_time: number | null;
  created_at: string;
  processing_status: string | null;
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
          file_path,
          word_count,
          estimated_read_time,
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
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">MindChunk</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, <span className="font-semibold text-foreground">{user?.email}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild size="sm">
                <Link to="/study">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Study
                </Link>
              </Button>
              <Button variant="ghost" onClick={handleLogout} size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-10 space-y-12">
        {/* Streak Counter */}
        <StreakCounter 
          currentStreak={stats.currentStreak} 
          longestStreak={stats.longestStreak}
          recentDays={getRecentDays()}
        />

        {/* Stats Grid */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Your Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Materials"
              value={stats.totalMaterials}
              icon={BookOpen}
              subtitle="Total uploaded"
            />
            <StatsCard
              title="Chunks Complete"
              value={stats.completedChunks}
              icon={Target}
              subtitle={`${stats.totalChunks} total chunks`}
            />
            <StatsCard
              title="Focus Time"
              value="0m"
              icon={Clock}
              subtitle="Total study time"
            />
            <StatsCard
              title="Current Streak"
              value={`${stats.currentStreak}d`}
              icon={Flame}
              subtitle={stats.currentStreak > 0 ? "Keep it up! 🔥" : "Start today!"}
              trend={stats.currentStreak >= 3 ? "📈 On fire!" : undefined}
            />
          </div>
        </section>

        {/* Materials List */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Study Materials</h2>
            <Button asChild size="sm">
              <Link to="/study">
                <Upload className="mr-2 h-4 w-4" />
                Upload Material
              </Link>
            </Button>
          </div>

          {materials.length === 0 ? (
            <Card className="p-12 text-center border-2 border-dashed">
              <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
                <div className="p-6 bg-primary/5 rounded-2xl">
                  <Upload className="h-12 w-12 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-semibold">No materials yet</p>
                  <p className="text-sm text-muted-foreground">
                    Upload your first study material to break it down into bite-sized chunks
                  </p>
                </div>
                <Button asChild>
                  <Link to="/study">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Material
                  </Link>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map((material) => (
                <MaterialCard 
                  key={material.id} 
                  material={material} 
                  onDelete={loadDashboardData}
                />
              ))}
            </div>
          )}
        </section>

        {/* Achievements */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Achievements</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {achievements.map((achievement) => (
              <AchievementBadge 
                key={achievement.title} 
                achievement={{
                  id: achievement.title.toLowerCase().replace(/\s+/g, '-'),
                  name: achievement.title,
                  description: achievement.description,
                  icon: achievement.title.includes("First") ? "🎯" : 
                        achievement.title.includes("Getting") ? "⚡" :
                        achievement.title.includes("Dedicated") ? "🏆" :
                        achievement.title.includes("3-Day") ? "🔥" : "🎖️",
                  unlocked: achievement.unlocked,
                }}
                unlocked={achievement.unlocked} 
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
