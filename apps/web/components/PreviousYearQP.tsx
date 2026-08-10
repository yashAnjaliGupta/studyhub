"use client";

import React, { useState } from "react";
import { FileText, Eye, Download, ChevronRight, Calendar, BookOpen, Layers } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Paper {
    title: string;
    subject: string;
    year: number | null;
    key: string;
}

interface PreviousYearPapersProps {
    papers: Paper[];
}

export default function PreviousYearPapers({ papers }: PreviousYearPapersProps) {
    const params = useParams();
    const Exam = (params?.Exam as string) || "";
    const Class = (params?.Class as string) || "";

    const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
    const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});

    // Group papers by subject, then by year
    const groupedPapers = papers.reduce((acc, paper) => {
        const subjectKey = paper.subject || "General";
        const yearKey = paper.year !== null ? String(paper.year) : "Other";

        if (!acc[subjectKey]) {
            acc[subjectKey] = {};
        }
        if (!acc[subjectKey][yearKey]) {
            acc[subjectKey][yearKey] = [];
        }
        acc[subjectKey][yearKey].push(paper);
        return acc;
    }, {} as Record<string, Record<string, Paper[]>>);

    const sortedSubjects = Object.keys(groupedPapers).sort();

    const getSortedYears = (subject: string) => {
        const subjectPapers = groupedPapers[subject];
        if (!subjectPapers) return [];
        return Object.keys(subjectPapers).sort((a, b) => {
            if (a === "Other") return 1;
            if (b === "Other") return -1;
            return Number(b) - Number(a); // Most recent years first
        });
    };

    const toggleSubject = (subject: string) => {
        setExpandedSubjects(prev => ({
            ...prev,
            [subject]: !prev[subject]
        }));
    };

    const toggleYear = (subject: string, year: string) => {
        const key = `${subject}-${year}`;
        setExpandedYears(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleExpandAll = () => {
        const allSubjects: Record<string, boolean> = {};
        const allYears: Record<string, boolean> = {};

        sortedSubjects.forEach(sub => {
            allSubjects[sub] = true;
            const subjectPapers = groupedPapers[sub];
            if (subjectPapers) {
                Object.keys(subjectPapers).forEach(yr => {
                    allYears[`${sub}-${yr}`] = true;
                });
            }
        });

        setExpandedSubjects(allSubjects);
        setExpandedYears(allYears);
    };

    const handleCollapseAll = () => {
        setExpandedSubjects({});
        setExpandedYears({});
    };
    const handleDownloadClick = async (s3Key: string, fileName: string) => {
        try {
            const response = await fetch(`/api/download-pdf?key=${encodeURIComponent(s3Key)}&name=${encodeURIComponent(fileName)}`);

            if (!response.ok) {
                throw new Error("Failed to download PDF");
            }

            const data = await response.json();
            if (data.downloadUrl) {
                window.location.href = data.downloadUrl;
            } else {
                throw new Error("No download URL returned");
            }
        } catch (error) {
            console.error("Error downloading PDF:", error);
            alert("Failed to download PDF");
        }
    };


    if (papers.length === 0) {
        return (
            <></>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md mt-20">
            {/* Header */}
            <div className="flex flex-col gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white/10 p-2 backdrop-blur">
                        <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Previous Year Papers</h2>
                        <p className="text-xs text-blue-100 opacity-90">Organized by Subject & Year</p>
                    </div>
                </div>

                {/* Bulk controls */}
                <div className="flex gap-2">
                    <button
                        onClick={handleExpandAll}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-95 cursor-pointer"
                    >
                        Expand All
                    </button>
                    <button
                        onClick={handleCollapseAll}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-95 cursor-pointer"
                    >
                        Collapse All
                    </button>
                </div>
            </div>

            {/* Accordion Content */}
            <div className="divide-y divide-slate-100 bg-slate-50/50">
                {sortedSubjects.map(subject => {
                    const isSubjectExpanded = !!expandedSubjects[subject];
                    const years = getSortedYears(subject);
                    const subjectPapers = groupedPapers[subject];
                    const totalPapersInSubject = subjectPapers
                        ? Object.values(subjectPapers).reduce((sum, arr) => sum + arr.length, 0)
                        : 0;

                    return (
                        <div key={subject} className="transition-all duration-300">
                            {/* Subject Header Row */}
                            <button
                                onClick={() => toggleSubject(subject)}
                                className="flex w-full items-center justify-between bg-white px-6 py-4.5 text-left transition hover:bg-slate-50 cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <ChevronRight
                                        className={`h-5 w-5 text-slate-400 transition-transform duration-300 group-hover:text-blue-600 ${isSubjectExpanded ? "rotate-90 text-blue-600" : ""
                                            }`}
                                    />
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                        <BookOpen className="h-4 w-4" />
                                    </div>
                                    <span className="font-semibold text-slate-800 group-hover:text-blue-700">
                                        {subject}
                                    </span>
                                </div>
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700">
                                    {totalPapersInSubject} {totalPapersInSubject === 1 ? "Paper" : "Papers"}
                                </span>
                            </button>

                            {/* Years List Container */}
                            {isSubjectExpanded && (
                                <div className="border-t border-slate-100/50 bg-slate-50/50 px-6 py-3 space-y-2.5">
                                    {years.map(year => {
                                        const yearKey = `${subject}-${year}`;
                                        const isYearExpanded = !!expandedYears[yearKey];
                                        const yearPapers = groupedPapers[subject]?.[year] || [];

                                        return (
                                            <div
                                                key={yearKey}
                                                className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm"
                                            >
                                                {/* Year Sub-Header Row */}
                                                <button
                                                    onClick={() => toggleYear(subject, year)}
                                                    className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50/80 cursor-pointer group"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <ChevronRight
                                                            className={`h-4.5 w-4.5 text-slate-400 transition-transform duration-300 group-hover:text-indigo-600 ${isYearExpanded ? "rotate-90 text-indigo-600" : ""
                                                                }`}
                                                        />
                                                        <Calendar className="h-4 w-4 text-indigo-500" />
                                                        <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700">
                                                            {year === "Other" ? "Other Papers" : `Year ${year}`}
                                                        </span>
                                                    </div>
                                                    <span className="rounded-full bg-indigo-50/70 px-2 py-0.5 text-xs font-semibold text-indigo-600">
                                                        {yearPapers.length}
                                                    </span>
                                                </button>

                                                {/* Papers List for Year */}
                                                {isYearExpanded && (
                                                    <div className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/30">
                                                        {yearPapers.map(paper => (
                                                            <div
                                                                key={paper.title}
                                                                className="flex flex-col gap-3.5 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-white transition-colors"
                                                            >
                                                                {/* Paper Info */}
                                                                <div className="flex items-start gap-3 min-w-0">
                                                                    <div className="mt-0.5 flex h-7.5 w-7.5 flex-shrink-0 items-center justify-center rounded bg-slate-100 text-slate-600">
                                                                        <FileText className="h-4 w-4" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <h4 className="text-sm font-medium text-slate-800 truncate" title={paper.title}>
                                                                            {paper.title}
                                                                        </h4>
                                                                        <p className="text-xs text-slate-400">
                                                                            {subject} • {year === "Other" ? "N/A" : year}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Actions */}
                                                                <div className="flex gap-2 flex-shrink-0">
                                                                    <Link
                                                                        href={`/${encodeURIComponent(decodeURIComponent(Exam))}/${encodeURIComponent(decodeURIComponent(Class))}/${encodeURIComponent(paper.subject)}/${encodeURIComponent(paper.title)}`}
                                                                    >
                                                                        <button className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-95 cursor-pointer">
                                                                            <Eye className="h-3.5 w-3.5" />
                                                                            <span>View</span>
                                                                        </button>
                                                                    </Link>
                                                                    <button onClick={() => handleDownloadClick(paper.key, paper.title)} className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 active:scale-95 cursor-pointer">
                                                                        <Download className="h-3.5 w-3.5" />
                                                                        <span>Download</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}