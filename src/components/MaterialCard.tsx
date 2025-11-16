import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, PlayCircle, BookOpen, MoreVertical, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StudyMaterial {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  word_count: number | null;
  estimated_read_time: number | null;
  created_at: string;
  processing_status: string | null;
}

interface MaterialCardProps {
  material: StudyMaterial;
  onDelete?: () => void;
}

export function MaterialCard({ material, onDelete }: MaterialCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [chunks, setChunks] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const { data: chunksData } = await supabase
        .from("study_chunks")
        .select("id")
        .eq("material_id", material.id);

      setChunks(chunksData || []);

      if (chunksData && chunksData.length > 0) {
        const { data: progressData } = await supabase
          .from("study_progress")
          .select("*")
          .eq("completed", true)
          .in(
            "chunk_id",
            chunksData.map((c) => c.id)
          );

        setProgress(progressData || []);
      }
    };

    fetchData();
  }, [material.id]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete the file from storage
      const { error: storageError } = await supabase.storage
        .from("study-materials")
        .remove([material.file_path]);

      if (storageError) throw storageError;

      // Delete the record from database (cascades to chunks and progress)
      const { error: dbError } = await supabase
        .from("study_materials")
        .delete()
        .eq("id", material.id);

      if (dbError) throw dbError;

      toast({
        title: "Material deleted",
        description: `"${material.title}" has been removed`,
      });

      onDelete?.();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const completedChunks = progress.length;
  const totalChunks = chunks.length;
  const progressPercentage = totalChunks > 0 ? (completedChunks / totalChunks) * 100 : 0;

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-smooth group">
        <CardHeader className="pb-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-1">
              <CardTitle className="text-xl font-bold truncate">{material.title}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {material.file_name} • {formatDistanceToNow(new Date(material.created_at), { addSuffix: true })}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-smooth">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass z-50">
                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Material
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">{material.word_count?.toLocaleString() || 0} words</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">{material.estimated_read_time || 0} min read</span>
            </div>
          </div>

          {chunks && chunks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">Progress</span>
                <span className="text-sm font-semibold text-foreground">
                  {completedChunks} / {chunks.length} chunks ({Math.round(progressPercentage)}%)
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Badge
              variant={material.processing_status === "completed" ? "default" : "secondary"}
              className="font-medium capitalize"
            >
              {material.processing_status || "pending"}
            </Badge>

            {material.processing_status === "completed" && chunks && chunks.length > 0 ? (
              <Button asChild size="sm">
                <Link to={`/study?material=${material.id}`}>
                  {completedChunks > 0 ? (
                    <>
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Continue
                    </>
                  ) : (
                    <>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Start
                    </>
                  )}
                </Link>
              </Button>
            ) : (
              <Button disabled size="sm" variant="secondary">
                Processing...
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{material.title}" and all associated chunks and progress. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
