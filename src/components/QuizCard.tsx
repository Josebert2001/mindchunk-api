import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface QuizCardProps {
  chunkId: string;
  onComplete: () => void;
  onSkip: () => void;
}

export const QuizCard = ({ chunkId, onComplete, onSkip }: QuizCardProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadQuestions();
  }, [chunkId]);

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('chunk_id', chunkId);

      if (error) throw error;

      setQuestions(data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast({
        title: "Failed to load quiz",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = () => {
    if (!selectedAnswer) return;

    const isCorrect = selectedAnswer === questions[currentQuestion].correct_answer;
    
    if (isCorrect) {
      setScore(score + 1);
    }

    setShowResult(true);
  };

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Quiz complete - save score and mark chunk as done
      const finalScore = Math.round((score / questions.length) * 100);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Update progress with quiz score
        const { error } = await supabase
          .from('study_progress')
          .upsert({
            user_id: user.id,
            chunk_id: chunkId,
            completed: true,
            quiz_score: finalScore,
            completed_at: new Date().toISOString(),
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error saving quiz score:', error);
      }
      
      toast({
        title: `Quiz Complete! 🎉`,
        description: `You scored ${finalScore}%`,
      });

      onComplete();
    }
  };

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading quiz...</p>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-lg mb-4">No quiz available for this chunk</p>
        <Button onClick={onSkip} variant="outline">
          Continue
        </Button>
      </Card>
    );
  }

  const question = questions[currentQuestion];
  const isCorrect = selectedAnswer === question.correct_answer;

  return (
    <Card className="p-8 shadow-soft">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <span className="text-sm font-semibold text-primary">
            Score: {score}/{currentQuestion + (showResult ? 1 : 0)}
          </span>
        </div>

        <h3 className="text-xl font-bold mb-6">{question.question}</h3>

        <div className="space-y-3 mb-6">
          {question.options.map((option, idx) => {
            const isSelected = selectedAnswer === option[0];
            const isCorrectOption = option[0] === question.correct_answer;
            
            let buttonClass = "w-full text-left p-4 rounded-lg border-2 transition-smooth ";
            
            if (showResult) {
              if (isCorrectOption) {
                buttonClass += "border-secondary bg-secondary/10 ";
              } else if (isSelected) {
                buttonClass += "border-destructive bg-destructive/10 ";
              } else {
                buttonClass += "border-border ";
              }
            } else {
              buttonClass += isSelected 
                ? "border-primary bg-primary/10 " 
                : "border-border hover:border-primary/50 ";
            }

            return (
              <button
                key={idx}
                onClick={() => !showResult && setSelectedAnswer(option[0])}
                disabled={showResult}
                className={buttonClass}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {showResult && isCorrectOption && (
                    <CheckCircle className="w-5 h-5 text-secondary" />
                  )}
                  {showResult && isSelected && !isCorrectOption && (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className={`p-4 rounded-lg mb-6 ${
            isCorrect ? 'bg-secondary/10 border-2 border-secondary' : 'bg-muted'
          }`}>
            <div className="flex items-start gap-2 mb-2">
              <Lightbulb className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">
                  {isCorrect ? "Correct! 🎉" : "Not quite..."}
                </p>
                <p className="text-sm text-muted-foreground">
                  {question.explanation}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button
          onClick={onSkip}
          variant="outline"
          disabled={showResult}
        >
          Skip Quiz
        </Button>

        {!showResult ? (
          <Button
            onClick={handleAnswer}
            disabled={!selectedAnswer}
            className="gradient-primary text-primary-foreground hover:opacity-90"
          >
            Check Answer
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            className="gradient-success text-secondary-foreground hover:opacity-90"
          >
            {currentQuestion < questions.length - 1 ? "Next Question" : "Complete"}
          </Button>
        )}
      </div>
    </Card>
  );
};
