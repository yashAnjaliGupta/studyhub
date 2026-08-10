"use client";
import SelectionBox from "@repo/ui/SelectionBox";
import { useState } from "react";
import { CONTENT_HIERARCHY } from "../lib/uploadHeirarchy";
import { FaCloudUploadAlt } from "react-icons/fa";
import { IoShieldCheckmark } from "react-icons/io5";
import { createUploadUrl } from "../actions/GetPresignedUrl";
import axios from "axios";
import { markUploadSuccessful } from "../actions/MarkUploadSuccessful";
type ExamKey = keyof typeof CONTENT_HIERARCHY;
type ClassKey = {
  [E in ExamKey]: keyof typeof CONTENT_HIERARCHY[E]["classes"];
}[ExamKey];

const uploadToS3 = async (
  file: File,
  uploadUrl: string,
  onProgress: (progress: number) => void
) => {
  await axios.put(uploadUrl, file, {
    headers: {
      "Content-Type": file.type,
    },

    onUploadProgress: (progressEvent) => {
      const total = progressEvent.total;

      if (!total) return;

      const progress = Math.round(
        (progressEvent.loaded * 100) / total
      );

      onProgress(progress);
    },
  });
};


export default function Uploadmetadata() {
  const [exam, setExam] = useState<ExamKey | "">("");
  const [selectedClass, setSelectedClass] = useState<ClassKey | "">("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async () => {
        if (!file) return;

        try {
            setUploading(true);

            const { uploadUrl,key } = await createUploadUrl({
            exam,
            selectedClass: selectedClass,
            subject,
            fileName: file.name,
            fileType: file.type,
            });

            await uploadToS3(
                file,
                uploadUrl,
                setProgress
            );
            setProgress(100);
            await markUploadSuccessful(key);
        } finally {
            setUploading(false);
        }
    };


  const examOptions = Object.keys(CONTENT_HIERARCHY) as ExamKey[];
  const classOptions = exam !== ""
    ? (Object.keys(CONTENT_HIERARCHY[exam].classes) as ClassKey[])
    : [];
  const subjectOptions =
    exam !== "" && selectedClass !== ""
      ? [
          ...(CONTENT_HIERARCHY[exam].classes as Record<string, { subjects: readonly string[] }>)[selectedClass]?.subjects ?? [],
        ]
      : [];
  return (
            <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
          <div className="mb-8">
            <h3 className="text-2xl font-semibold">
              Upload New File
            </h3>

            <p className="mt-1 text-slate-500">
              Choose the file and assign metadata before
              publishing.
            </p>
          </div>
            <div className="grid gap-6 md:grid-cols-2">
                {/* Exam */}
                <SelectionBox label="Exam" options={examOptions} callback={(value) => setExam(value as ExamKey | "")} />

                {/* Class */}
                <SelectionBox label="Class" options={classOptions} callback={(value) => setSelectedClass(value as ClassKey | "")} />
    
                {/* Subject */}
                <SelectionBox label="Subject" options={subjectOptions} callback={(value) => setSubject(value)} />
    
                {/* Content Type */}
                <SelectionBox label="Content Type" options={["Book", "Question Paper"]} />
                {/* Upload Area */}
        </div>
        <div className="mt-8">
            <label className="mb-2 block text-sm font-medium">
              File Uploadee
            </label>

            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <FaCloudUploadAlt className="h-12 w-12 text-blue-600" />

              <h4 className="mt-4 text-lg font-semibold">
                Drag & Drop PDF or DOCX
              </h4>

              <p className="mt-2 text-sm text-slate-500">
                Maximum file size 20MB
              </p>

              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="mt-6"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex flex-col gap-4 border-t pt-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <IoShieldCheckmark className="h-4 w-4 text-blue-600" />
              Files are validated before publishing
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              Upload File
            </button>
            {uploading && (
            <>
                <div className="w-full rounded-full bg-slate-200 h-3 overflow-hidden">
                <div
                    className="h-full bg-blue-600 transition-all"
                    style={{
                    width: `${progress}%`,
                    }}
                />
                </div>

                <p className="mt-2 text-sm text-slate-500">
                {progress}% uploaded
                </p>
            </>)}
            
          </div>
        </section>
    )
};