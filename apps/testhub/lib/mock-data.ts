export type MockPaper = {
  id: string;
  title: string;
  subject: string;
  examType: string;
  year: number;
  totalMarks: number;
  durationMin: number;
  questionCount: number;
  accent: string;
};

export const mockPapers: MockPaper[] = [
  { id: "jee-main-2024-physics", title: "JEE Main 2024 · Physics", subject: "Physics", examType: "JEE Main", year: 2024, totalMarks: 300, durationMin: 180, questionCount: 90, accent: "from-blue-500 to-indigo-600" },
  { id: "neet-2023-biology", title: "NEET 2023 · Biology", subject: "Biology", examType: "NEET", year: 2023, totalMarks: 360, durationMin: 60, questionCount: 45, accent: "from-emerald-500 to-teal-600" },
  { id: "jee-advanced-2022-maths", title: "JEE Advanced 2022 · Mathematics", subject: "Mathematics", examType: "JEE Advanced", year: 2022, totalMarks: 120, durationMin: 90, questionCount: 30, accent: "from-violet-500 to-fuchsia-600" },
];

export function getMockPaper(id: string) {
  const found = mockPapers.find((paper) => paper.id === id || String(paper.id) === String(id));
  if (found) return found;

  const rawTitle = decodeURIComponent(id || '').replaceAll('-', ' ');
  const formattedTitle = rawTitle.length > 0 ? rawTitle : 'Practice Paper';

  return {
    id: id,
    title: formattedTitle,
    subject: 'Practice',
    examType: 'TestHub Exam',
    year: 2024,
    totalMarks: 300,
    durationMin: 180,
    questionCount: 30,
    accent: 'from-amber-500 to-indigo-600',
  };
}
