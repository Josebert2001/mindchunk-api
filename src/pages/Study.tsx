import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/FileUpload";
import { ChunkViewer } from "@/components/ChunkViewer";
import { FocusTimer } from "@/components/FocusTimer";

export default function Study() {
  const [searchParams] = useSearchParams();
  const materialId = searchParams.get("material");
  const [processing, setProcessing] = useState(false);
  const [currentMaterialId, setCurrentMaterialId] = useState<string | null>(materialId);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  const handleUploadComplete = async (materialId: string) => {
    setProcessing(true);
    
    try {
      toast({
        title: "Processing content...",
        description: "This may take a minute. Creating your learning chunks!",
      });

      const { data, error } = await supabase.functions.invoke('process-content', {
        body: { materialId, chunkSize: 5 },
      });

      if (error) {
        if (error.message?.includes('429')) {
          throw new Error('AI service is busy. Please wait a moment and try again.');
        }
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Processing failed. Try with simpler content or a smaller file.');
      }

      toast({
        title: "Ready to learn! 🎉",
        description: `Created ${data.totalChunks} chunks (${data.estimatedTotalTime} min total)`,
      });

      setCurrentMaterialId(materialId);

    } catch (error) {
      console.error('Processing error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to process content. Check your internet connection and try again.";
      
      toast({
        title: "Processing failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            onClick={() => navigate("/dashboard")}
            variant="ghost"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Button>
          
          <h1 className="text-xl font-bold">MindChunk</h1>
          
          <div className="flex gap-2">
            <Button
              onClick={() => navigate("/dashboard")}
              variant="ghost"
              size="icon"
            >
              <LayoutDashboard className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {processing ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold mb-2">Creating Your Chunks...</h2>
              <p className="text-muted-foreground">
                Our AI is breaking down your content into perfect learning sessions
              </p>
            </div>
          </div>
        ) : currentMaterialId ? (
          <div>
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold mb-2">Your Study Session</h2>
              <p className="text-muted-foreground">
                Take your time with each chunk. Learning happens one step at a time!
              </p>
            </div>
            <FocusTimer compact={true} />
            <ChunkViewer materialId={currentMaterialId} />
          </div>
        ) : (
          <div>
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Upload Your Study Material</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Upload a PDF, text file, or image and we'll transform it into bite-sized learning chunks
              </p>
            </div>
            <FileUpload onUploadComplete={handleUploadComplete} />
          </div>
        )}
      </main>
    </div>
  );
}
