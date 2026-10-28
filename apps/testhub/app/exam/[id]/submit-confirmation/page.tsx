'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useExamTelemetry } from '@repo/telemetry/hooks';
import { PageContainer, PageHeading, MetricCard, Panel } from '../../../../components/ui';
import { getExamSession } from '../../../../lib/exam-session';

export default function ExamSubmitConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoSubmitted = searchParams.get('autoSubmitted') === 'true';
  const reason = searchParams.get('reason');
  const { trackAttemptSubmitted } = useExamTelemetry();

  const sessionData = useMemo(() => getExamSession(id), [id]);
  const answers = sessionData?.answers || {};
  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k] !== undefined && answers[k] !== null && answers[k] !== ''
  ).length;
  const reviewCount = sessionData?.review?.length || 0;
  const visitedCount = sessionData?.visited?.length || 0;
  const notAnsweredCount = Math.max(0, visitedCount - answeredCount);

  const submit = () => {
    trackAttemptSubmitted(id);
    router.push(`/exam/${id}/results`);
  };

  return (
    <PageContainer className="max-w-5xl">
      {autoSubmitted && (
        <div className="mb-6 rounded-xl border-2 border-red-500 bg-red-50 p-4 sm:p-5 text-red-900 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-600 text-lg font-bold text-white">
              ⚠️
            </span>
            <div>
              <h2 className="text-base font-extrabold text-red-900">
                Session Auto-Submitted Due to Proctoring Violation
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-red-800">
                {reason === 'proctoring_violation'
                  ? 'The test was automatically terminated and submitted because multiple screen change, window focus loss, or fullscreen exit attempts were detected.'
                  : reason === 'time_expired'
                  ? 'Your examination time has expired. The test has been automatically submitted.'
                  : 'Your exam was automatically submitted by the system safety handler.'}
              </p>
            </div>
          </div>
        </div>
      )}
      <PageHeading
        eyebrow={autoSubmitted ? "Exam Terminated" : "Finish session"}
        title={autoSubmitted ? "Auto-Submitted Responses" : "Review before submitting"}
        description={
          autoSubmitted
            ? "Your responses have been recorded and locked by the proctoring monitor."
            : "Once submitted, you can review your results and revisit every answer."
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel className="p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#fff1df] text-lg font-bold text-[#c66a00]">!</span>
            <div><h2 className="text-lg font-bold text-[#102a56]">Ready to end this practice session?</h2><p className="mt-1 text-sm leading-6 text-[#68778b]">Review the response summary. Your answers will be locked after submission.</p></div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MetricCard label="Answered" value={String(answeredCount)} tone="green" />
            <MetricCard label="Not answered" value={String(notAnsweredCount)} tone="red" />
            <MetricCard label="Marked for review" value={String(reviewCount)} tone="orange" />
          </div>
          {notAnsweredCount > 0 ? (
            <div className="mt-5 rounded-lg border border-[#f5ddb6] bg-[#fff8ed] p-4 text-sm leading-6 text-[#6f5128]">
              You have {notAnsweredCount} visited but unanswered question{notAnsweredCount > 1 ? 's' : ''}. You can return to the test and answer {notAnsweredCount > 1 ? 'them' : 'it'} before submitting.
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-[#bde8cd] bg-[#e7f8ee] p-4 text-sm leading-6 text-[#258747]">
              All visited questions have been answered. You are ready to submit!
            </div>
          )}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button onClick={() => router.push(`/exam/${id}`)} className="rounded-lg border border-[#d9e1ec] bg-white px-4 py-2.5 text-sm font-semibold text-[#0875f9] hover:bg-slate-50">Continue practice</button>
            <button onClick={submit} className="rounded-lg bg-[#35a853] px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700">Yes, submit practice</button>
          </div>
        </Panel>
        <Panel className="p-5">
          <h2 className="text-sm font-bold text-[#102a56]">What happens next?</h2>
          <ol className="mt-4 space-y-4 text-sm">
            <Step number="1" title="Your responses are reviewed" detail="We calculate your score and accuracy." />
            <Step number="2" title="Explore your results" detail="See your performance by topic." />
            <Step number="3" title="Plan your next session" detail="Use the study guidance to choose what to practice." />
          </ol>
        </Panel>
      </div>
    </PageContainer>
  );
}

function Step({ number, title, detail }: { number: string; title: string; detail: string }) {
  return <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-[#0875f9]">{number}</span><div><p className="font-semibold text-[#1c2d45]">{title}</p><p className="mt-0.5 text-xs leading-5 text-[#68778b]">{detail}</p></div></li>;
}
