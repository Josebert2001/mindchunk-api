import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
import { useState } from "react";

interface MaterialCardProps {
  id: string;
  title: string;
  fileName: string;
  wordCount: number;
  createdAt: string;
  processingStatus: string;
  progress?: number;
  totalChunks?: number;
  completedChunks?: number;
  onContinue: (id: string) => void;
  onDelete: (id: string) => void;
}

export function MaterialCard({
  id,
  title,
  fileName,
  wordCount,
  createdAt,
  processingStatus,
  progress = 0,
  totalChunks = 0,
  completedChunks = 0,
  onContinue,
  onDelete,
}: MaterialCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getStatusColor = () => {
    if (processingStatus === 'completed') return 'bg-secondary';
    if (processingStatus === 'processing') return 'bg-primary';
    return 'bg-muted';
  };

  const getProgressColor = () => {
    if (progress < 30) return 'bg-destructive';
    if (progress < 70) return 'bg-primary';
    return 'bg-secondary';
  };

  return (
    <>
      <Card className="p-6 hover:shadow-soft transition-smooth">
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 p-3 rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-lg font-semibold text-foreground truncate">{title}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onContinue(id)}>
                    Continue Learning
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge className={getStatusColor()}>
                {processingStatus === 'completed' ? 'Ready' : 'Processing'}
              </Badge>
              <span className="text-sm text-muted-foreground">{fileName}</span>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{wordCount.toLocaleString()} words</span>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
              </span>
            </div>

            {totalChunks > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {completedChunks} of {totalChunks} chunks complete
                  </span>
                  <span className="text-foreground font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className={getProgressColor()} />
              </div>
            )}

            <div className="mt-4">
              <Button 
                onClick={() => onContinue(id)} 
                className="w-full sm:w-auto"
                disabled={processingStatus !== 'completed'}
              >
                {processingStatus === 'completed' 
                  ? (completedChunks > 0 ? 'Continue Learning' : 'Start Learning')
                  : 'Processing...'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this material and all associated chunks and progress. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
