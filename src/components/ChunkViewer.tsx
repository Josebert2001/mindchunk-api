import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Award, Circle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { QuizCard } from "./QuizCard";

interface Chunk {
  id: string;
  chunk_number: number;
  title: string;
  content: string;
  main_concept: string;
  estimated_minutes: number;
  difficulty: string;
  key_terms: string[];
}

interface ChunkViewerProps {
  materialId: string;
}

export const ChunkViewer = ({ materialId }: ChunkViewerProps) => {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [completedChunks, setCompletedChunks] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadChunks();
  }, [materialId]);

  const loadChunks = async () => {
    try {
      const { data, error } = await supabase
        .from('study_chunks')
        .select('*')
        .eq('material_id', materialId)
        .order('chunk_number');

      if (error) throw error;

      setChunks(data || []);

      // Load progress
      const { data: progressData } = await supabase
        .from('study_progress')
        .select('chunk_id, completed')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('completed', true);

      if (progressData) {
        setCompletedChunks(new Set(progressData.map(p => p.chunk_id)));
      }

    } catch (error) {
      console.error('Error loading chunks:', error);
      toast({
        title: "Failed to load chunks",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markChunkComplete = async () => {
    const currentChunk = chunks[currentIndex];
    if (!currentChunk) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('study_progress')
        .upsert({
          user_id: user.id,
          chunk_id: currentChunk.id,
          completed: true,
          completed_at: new Date().toISOString(),
        });

      if (error) throw error;

      setCompletedChunks(prev => new Set([...prev, currentChunk.id]));
      
      // Show celebration animation
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);

      toast({
        title: "🎉 Chunk completed!",
        description: "Great progress! Keep going!",
      });

    } catch (error) {
      console.error('Error marking complete:', error);
    }
  };

  const handleNext = () => {
    if (currentIndex < chunks.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowQuiz(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowQuiz(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your chunks...</p>
          </div>
        </div>
        {/* Show progress skeletons while loading */}
        <Card className="p-4">
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded-lg animate-pulse w-3/4"></div>
            <div className="h-2 bg-muted rounded-lg animate-pulse"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (chunks.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-lg text-muted-foreground mb-4">No chunks available yet</p>
        <p className="text-sm text-muted-foreground mb-6">
          Chunks for this material haven't been generated yet. Try uploading it again or check back later.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh Page
        </Button>
      </Card>
    );
  }

  const currentChunk = chunks[currentIndex];
  const progress = ((completedChunks.size) / chunks.length) * 100;
  const progressColor = progress < 30 ? 'bg-destructive' : progress < 70 ? 'bg-primary' : 'bg-secondary';

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-scale-in">
            <div className="text-8xl">🎉</div>
          </div>
          <style>{`
            @keyframes scale-in {
              0% { transform: scale(0) rotate(0deg); opacity: 0; }
              50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
              100% { transform: scale(1) rotate(360deg); opacity: 0; }
            }
            .animate-scale-in {
              animation: scale-in 2s ease-out;
            }
          `}</style>
        </div>
      )}

      {/* Progress Bar */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-accent" />
            <span className="font-semibold">Your Progress</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {completedChunks.size} of {chunks.length} completed ({Math.round(progress)}%)
          </span>
        </div>
        <Progress value={progress} className={`h-3 ${progressColor}`} />
        
        {/* Chunk Navigation Indicators */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {chunks.map((chunk, index) => (
            <button
              key={chunk.id}
              onClick={() => {
                setCurrentIndex(index);
                setShowQuiz(false);
              }}
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-smooth ${
                index === currentIndex
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                  : completedChunks.has(chunk.id)
                  ? 'bg-secondary/20 text-secondary hover:bg-secondary/30'
                  : 'bg-muted hover:bg-muted/80'
              }`}
              title={`Chunk ${chunk.chunk_number}: ${chunk.title}`}
            >
              {completedChunks.has(chunk.id) ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <span className="text-sm font-semibold">{chunk.chunk_number}</span>
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Chunk Content */}
      {!showQuiz ? (
        <Card className="p-8 shadow-soft">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">
                Chunk {currentChunk.chunk_number} of {chunks.length}
              </span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {currentChunk.estimated_minutes} min
                </div>
                <span className={`text-xs px-3 py-1 rounded-full ${
                  currentChunk.difficulty === 'easy' ? 'bg-secondary/20 text-secondary' :
                  currentChunk.difficulty === 'medium' ? 'bg-primary/20 text-primary' :
                  'bg-accent/20 text-accent'
                }`}>
                  {currentChunk.difficulty}
                </span>
              </div>
            </div>

            <h2 className="mb-3">{currentChunk.title}</h2>
            {currentChunk.main_concept && (
              <p className="text-lg text-primary font-medium mb-4">
                💡 {currentChunk.main_concept}
              </p>
            )}
          </div>

          <div className="prose prose-lg max-w-none mb-8">
            <ReactMarkdown>{currentChunk.content}</ReactMarkdown>
          </div>

          {currentChunk.key_terms && currentChunk.key_terms.length > 0 && (
            <div className="mb-8">
              <p className="font-semibold mb-3">Key Terms:</p>
              <div className="flex flex-wrap gap-2">
                {currentChunk.key_terms.map((term, idx) => (
                  <span
                    key={idx}
                    className="px-4 py-2 bg-muted rounded-lg text-sm font-medium"
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              variant="outline"
              size="lg"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {completedChunks.has(currentChunk.id) ? (
              <div className="flex items-center gap-2 text-secondary font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                Completed
              </div>
            ) : (
              <Button
                onClick={() => setShowQuiz(true)}
                className="gradient-primary text-primary-foreground hover:opacity-90"
                size="lg"
              >
                Take Quiz
              </Button>
            )}

            <Button
              onClick={handleNext}
              disabled={currentIndex === chunks.length - 1}
              variant="outline"
              size="lg"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      ) : (
        <QuizCard
          chunkId={currentChunk.id}
          onComplete={() => {
            markChunkComplete();
            setShowQuiz(false);
          }}
          onSkip={() => setShowQuiz(false)}
        />
      )}
    </div>
  );
};
