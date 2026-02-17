import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";

export interface UploadDropzoneProps {
    onFileSelect: (file: File) => void;
    accept?: string;
    maxSize?: number;
    isUploading?: boolean;
    uploadProgress?: number;
    error?: string | null;
    success?: boolean;
    className?: string;
}

export function UploadDropzone({
    onFileSelect,
    accept = ".pdf,.doc,.docx",
    maxSize = 5 * 1024 * 1024, // 5MB default
    isUploading = false,
    uploadProgress = 0,
    error = null,
    success = false,
    className,
}: UploadDropzoneProps) {
    const [isDragOver, setIsDragOver] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDrop = React.useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);

            const file = e.dataTransfer.files?.[0];
            if (file) {
                onFileSelect(file);
            }
        },
        [onFileSelect]
    );

    const handleDragOver = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleFileChange = React.useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                onFileSelect(file);
            }
        },
        [onFileSelect]
    );

    return (
        <GlassCard
            className={cn(
                "relative cursor-pointer transition-all duration-300",
                isDragOver && "scale-105 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)]",
                className
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isUploading && fileInputRef.current?.click()}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
            />

            <div className="p-8 text-center">
                <AnimatePresence mode="wait">
                    {success ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex flex-col items-center"
                        >
                            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                            <p className="font-medium text-green-500">Upload Successful!</p>
                        </motion.div>
                    ) : error ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex flex-col items-center"
                        >
                            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
                            <p className="font-medium text-destructive">{error}</p>
                        </motion.div>
                    ) : isUploading ? (
                        <motion.div
                            key="uploading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center"
                        >
                            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mb-4" />
                            <p className="font-medium mb-2">Uploading...</p>
                            <div className="w-full max-w-xs h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400"
                                    initial={{ width: "0%" }}
                                    animate={{ width: `${uploadProgress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col items-center"
                        >
                            <motion.div
                                animate={isDragOver ? { scale: 1.2, rotate: 10 } : { scale: 1, rotate: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Upload className="w-16 h-16 text-muted-foreground mb-4" />
                            </motion.div>
                            <p className="font-medium text-lg mb-2">Drop your file here</p>
                            <p className="text-sm text-muted-foreground">
                                or click to browse ({accept})
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                                Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {isDragOver && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 border-2 border-dashed border-indigo-500 rounded-2xl pointer-events-none"
                />
            )}
        </GlassCard>
    );
}
