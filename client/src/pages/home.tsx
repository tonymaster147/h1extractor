import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileWarning } from "lucide-react";
import { uploadCSV, downloadProcessedCSV } from "@/lib/api";
import type { ProcessingResult } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a CSV file"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 5MB"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await uploadCSV(file);
      setResult(result);
      toast({
        title: "Success",
        description: "File processed successfully"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process file"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">H1 Tag Extractor</h1>
          <p className="text-muted-foreground">
            Upload a CSV file with URLs to extract H1 tags
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                isDragging ? "border-primary bg-primary/5" : "border-muted"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="space-y-4">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">
                    Drag and drop your CSV file here
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  id="file-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={isProcessing}
                >
                  Select File
                </Button>
              </div>
            </div>

            {isProcessing && (
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing...</span>
                  <span>Please wait</span>
                </div>
                <Progress value={33} className="h-2" />
              </div>
            )}

            {result?.status === "completed" && result.downloadUrl && (
              <div className="mt-6">
                <Button
                  className="w-full"
                  onClick={() => downloadProcessedCSV(result.downloadUrl!)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Results
                </Button>
              </div>
            )}

            {result?.status === "error" && (
              <div className="mt-6 p-4 bg-destructive/10 rounded-lg flex items-center gap-3 text-destructive">
                <FileWarning className="w-5 h-5" />
                <p className="text-sm font-medium">{result.message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
