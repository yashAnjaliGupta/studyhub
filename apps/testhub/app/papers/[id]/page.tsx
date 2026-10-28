'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getMockPaper } from '../../../lib/mock-data';
import { PageContainer, PageHeading, Panel } from '../../../components/ui';

export default function PaperDetailPage() {
  const params = useParams<{ id: string }>();
  const mockPaper = getMockPaper(params.id);

  return (
    <PageContainer className="max-w-4xl">
        <PageHeading eyebrow={`${mockPaper.examType} · ${mockPaper.year}`} title={mockPaper.title} description="Review the sample paper, then customize a practice session that fits your study plan." action={<Link href="/papers" className="text-sm font-semibold text-blue-700 hover:text-blue-800">← All papers</Link>} />

        <Panel className="overflow-hidden">
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm text-gray-500">
              <div>
                <span className="font-medium">Subject:</span> {mockPaper.subject}
              </div>
              <div>
                <span className="font-medium">Exam Type:</span> {mockPaper.examType}
              </div>
              <div>
                <span className="font-medium">Year:</span> {mockPaper.year}
              </div>
              <div>
                <span className="font-medium">Total Questions:</span> {mockPaper.questionCount}
              </div>
              <div>
                <span className="font-medium">Total Marks:</span> {mockPaper.totalMarks}
              </div>
              <div>
                <span className="font-medium">Duration:</span> {mockPaper.durationMin} minutes
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 pb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Available Actions
              </h2>
              <Link href={`/exam/${mockPaper.id}/configure`} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                Start Exam
              </Link>
            </div>
          </div>
        </Panel>
    </PageContainer>
  );
}
