"use client";

import React, { useState } from "react";
import { Download, Loader2, AlertCircle, Check } from "lucide-react";

interface DownloadButtonProps {
  className: string;
  subjectName: string;
  bookName: string;
}

export default function DownloadButton({
  className,
  subjectName,
  bookName,
}: DownloadButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleDownload = async () => {
    if (status === "loading") return;

    setStatus("loading");

    try {
      const url = `/api/download-book?className=${encodeURIComponent(
        className
      )}&subjectName=${encodeURIComponent(subjectName)}&bookName=${encodeURIComponent(
        bookName
      )}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to download book: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${bookName}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setStatus("success");
      setTimeout(() => {
        setStatus("idle");
      }, 2000);
    } catch (error) {
      console.error("Download failed:", error);
      setStatus("error");
      setTimeout(() => {
        setStatus("idle");
      }, 3000);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={status === "loading"}
      className={`rounded-lg border p-2 transition-all duration-200 ${status === "loading"
          ? "bg-blue-50 border-blue-200 cursor-not-allowed"
          : status === "success"
            ? "bg-green-50 border-green-200 text-green-600"
            : status === "error"
              ? "bg-red-50 border-red-200 text-red-600"
              : "hover:bg-slate-100 hover:border-slate-300 text-slate-700 active:scale-95 cursor-pointer"
        }`}
      title={
        status === "loading"
          ? "Downloading PDF..."
          : status === "success"
            ? "Downloaded successfully!"
            : status === "error"
              ? "Failed to download book. Please try again."
              : `Download PDF of ${bookName}`
      }
    >
      {status === "loading" && (
        <Loader2 className="mx-auto h-4 w-4 animate-spin text-blue-600" />
      )}
      {status === "success" && (
        <Check className="mx-auto h-4 w-4 text-green-600" />
      )}
      {status === "error" && (
        <AlertCircle className="mx-auto h-4 w-4 text-red-600 animate-bounce" />
      )}
      {status === "idle" && (
        <Download className="mx-auto h-4 w-4" />
      )}
    </button>
  );
}
