import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Image, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FileUploadProps {
  onUploadComplete: (materialId: string) => void;
}

export const FileUpload = ({ onUploadComplete }: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (file: File) => {
    const allowedTypes = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, TXT, JPG, or PNG file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setFile(file);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to upload files",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      setProgress(30);

      const formData = new FormData();
      formData.append('file', file);

      setProgress(50);

      const { data, error } = await supabase.functions.invoke('process-upload', {
        body: formData,
      });

      setProgress(100);

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      toast({
        title: "Upload successful!",
        description: `${data.material.word_count} words extracted. Processing chunks...`,
      });

      onUploadComplete(data.material.id);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="w-12 h-12 text-muted-foreground" />;
    if (file.type.startsWith('image/')) return <Image className="w-12 h-12 text-primary" />;
    return <FileText className="w-12 h-12 text-primary" />;
  };

  return (
    <Card className="p-8 max-w-2xl mx-auto shadow-soft">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary transition-smooth cursor-pointer"
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className="flex flex-col items-center gap-4">
          {getFileIcon()}
          
          {!file ? (
            <>
              <div>
                <p className="text-lg font-semibold mb-2">Drop your file here</p>
                <p className="text-sm text-muted-foreground">
                  or click to browse
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                PDF, TXT, JPG, PNG • Max 10MB
              </p>
            </>
          ) : (
            <div className="w-full">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-secondary" />
                <p className="font-semibold">{file.name}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          <input
            id="file-input"
            type="file"
            accept=".pdf,.txt,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {uploading && (
        <div className="mt-6 space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-center text-muted-foreground">
            {progress < 50 ? "Uploading..." : "Extracting text..."}
          </p>
        </div>
      )}

      {file && !uploading && (
        <div className="mt-6 flex gap-3">
          <Button
            onClick={handleUpload}
            className="flex-1 gradient-primary text-primary-foreground hover:opacity-90 transition-smooth"
            size="lg"
          >
            Process & Create Chunks
          </Button>
          <Button
            onClick={() => setFile(null)}
            variant="outline"
            size="lg"
          >
            Clear
          </Button>
        </div>
      )}
    </Card>
  );
};
