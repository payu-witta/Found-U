"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Camera } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  preview?: string | null;
  onClear?: () => void;
  className?: string;
  compact?: boolean;
}

export function ImageUpload({
  onImageSelect,
  preview,
  onClear,
  className,
  compact,
}: ImageUploadProps) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const displayPreview = preview ?? localPreview;

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        onImageSelect(file);
        setLocalPreview(URL.createObjectURL(file));
      }
    },
    [onImageSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  if (displayPreview) {
    return (
      <div className={cn("relative overflow-hidden rounded-xl", className)}>
        <div className="relative aspect-square">
          <Image
            src={displayPreview}
            alt="Upload preview"
            fill
            className="object-cover"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setLocalPreview(null);
            onClear?.();
          }}
          className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
          aria-label="Remove image"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-brand-400 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-500 dark:hover:bg-gray-800",
        isDragActive && "border-brand-500 bg-brand-50 dark:bg-gray-800",
        compact ? "p-6" : "aspect-square p-8",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center text-center">
        {compact ? (
          <Camera className="mb-2 h-8 w-8 text-gray-400 dark:text-gray-500" />
        ) : (
          <Upload className="mb-3 h-10 w-10 text-gray-400 dark:text-gray-500" />
        )}
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {isDragActive ? "Drop your photo here" : "Upload a photo"}
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Drag & drop or tap to select
        </p>
      </div>
    </div>
  );
}
