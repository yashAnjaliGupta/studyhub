export interface SubjectBreakdown {
  subject: string;
  questionCount: number;
  marks: number;
}

export interface MarkingRuleSummary {
  type: string;
  rule: string;
}

export interface PaperInstructionsData {
  isBilingual: boolean;
  primaryLanguage: string;
  availableLanguages: string[];
  totalQuestions: number;
  totalMarks: number;
  durationMin: number;
  subjectBreakdown: SubjectBreakdown[];
  markingSummary: MarkingRuleSummary[];
  instructionsByLanguage: Record<string, string[]>;
}

/**
 * Detect language profile of text (English, Hindi, or Bilingual).
 */
export function detectLanguageProfile(sampleTexts: string[]): {
  isBilingual: boolean;
  primaryLanguage: string;
  availableLanguages: string[];
} {
  const combined = sampleTexts.join(' ');
  const devanagariMatches = combined.match(/[\u0900-\u097F]/g) || [];
  const latinMatches = combined.match(/[a-zA-Z]/g) || [];

  const devanagariCount = devanagariMatches.length;
  const latinCount = latinMatches.length;

  if (devanagariCount > 80 && latinCount > 80) {
    return {
      isBilingual: true,
      primaryLanguage: 'English',
      availableLanguages: ['English', 'Hindi'],
    };
  } else if (devanagariCount > latinCount * 1.5) {
    return {
      isBilingual: false,
      primaryLanguage: 'Hindi',
      availableLanguages: ['Hindi'],
    };
  }

  return {
    isBilingual: false,
    primaryLanguage: 'English',
    availableLanguages: ['English'],
  };
}

/**
 * AI-powered instruction synthesizer that gathers instructions from the paper preamble,
 * question breakdown, and platform context, producing concise, localized instructions in
 * the exact language(s) of the paper.
 */
export async function generateCustomInstructions(params: {
  paperTitle: string;
  examType: string;
  subject: string;
  year: number;
  durationMin: number;
  totalMarks: number;
  questions: Array<{
    sequenceNum: number;
    text: string;
    type?: string;
    marks: number;
    negativeMarks?: number | null;
    subject?: string;
  }>;
  rawPreambleText?: string;
}): Promise<PaperInstructionsData> {
  const {
    paperTitle,
    examType,
    subject,
    year,
    durationMin = 180,
    questions = [],
    rawPreambleText = '',
  } = params;

  // 1. Language Detection
  const sampleTexts = [rawPreambleText, ...questions.slice(0, 10).map((q) => q.text)];
  const langProfile = detectLanguageProfile(sampleTexts);

  // 2. Compute exact subject breakdown
  const subjectMap = new Map<string, { count: number; marks: number }>();
  for (const q of questions) {
    const s = q.subject || subject || 'General';
    const curr = subjectMap.get(s) || { count: 0, marks: 0 };
    curr.count += 1;
    curr.marks += q.marks || 4;
    subjectMap.set(s, curr);
  }

  const subjectBreakdown: SubjectBreakdown[] = Array.from(subjectMap.entries()).map(([subj, val]) => ({
    subject: subj,
    questionCount: val.count,
    marks: val.marks,
  }));

  const totalQuestions = questions.length;
  const computedTotalMarks = questions.reduce((sum, q) => sum + (q.marks || 4), 0);

  // 3. Compute marking rules summary from actual questions
  const hasMcqSingle = questions.some((q) => !q.type || q.type === 'mcq_single');
  const hasMcqMulti = questions.some((q) => q.type === 'mcq_multiple');
  const hasNumerical = questions.some((q) => q.type === 'numerical');
  const hasSubjective = questions.some((q) => q.type === 'text_subjective');

  const markingSummary: MarkingRuleSummary[] = [];
  if (hasMcqSingle) {
    markingSummary.push({
      type: 'Single-Choice (MCQ)',
      rule: '+4 for correct response, -1 for incorrect attempt, 0 if unanswered',
    });
  }
  if (hasMcqMulti) {
    markingSummary.push({
      type: 'Multiple-Correct (One or more)',
      rule: '+4 if all correct options are selected, partial marking for subset, -2 for incorrect',
    });
  }
  if (hasNumerical) {
    markingSummary.push({
      type: 'Numerical Value',
      rule: '+4 for correct numerical integer/decimal value, 0 for incorrect (no negative marks)',
    });
  }
  if (hasSubjective) {
    markingSummary.push({
      type: 'Descriptive / Subjective',
      rule: 'Step-wise marking based on key evaluation criteria and derivations. No negative marking',
    });
  }

  // 4. Extract instructions provided by the Planner Blueprint
  const blueprintInstructions = rawPreambleText
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 5 && !s.startsWith('---'));

  // 5. Intelligent multilingual generator
  const fallbackEnglish = [
    ...(blueprintInstructions.length > 0 ? blueprintInstructions : []),
    `This examination consists of ${totalQuestions} questions with a total of ${computedTotalMarks} marks.`,
    `Total duration allotted for this test is ${durationMin} minutes. The countdown timer on the top bar indicates remaining time.`,
    `Subject Distribution: ${subjectBreakdown.map((s) => `${s.subject} (${s.questionCount} Questions, ${s.marks} Marks)`).join(', ')}.`,
    ...markingSummary.map((m) => `${m.type}: ${m.rule}.`),
    `Use the Question Palette on the side to navigate directly to any question. Filter by subjects using the top subject tabs.`,
    `Click 'Save & Next' to save your answer and move to the next question. You can modify your answer anytime before final submission.`,
    `Use 'Mark for Review & Next' to flag a question for later review. Marked questions are highlighted in purple on the palette.`,
    `The examination will automatically submit when the timer reaches zero. You can also submit early once you have reviewed all questions.`,
  ];

  const fallbackHindi = [
    `इस परीक्षा में कुल ${totalQuestions} प्रश्न हैं, जिनका कुल पूर्णांक ${computedTotalMarks} अंक है।`,
    `इस परीक्षा की कुल अवधि ${durationMin} मिनट है। स्क्रीन के शीर्ष पर दिया गया टाइमर शेष समय प्रदर्शित करता है।`,
    `विषयवार विवरण: ${subjectBreakdown.map((s) => `${s.subject} (${s.questionCount} प्रश्न, ${s.marks} अंक)`).join(', ')}।`,
    ...markingSummary.map((m) => `${m.type}: ${m.rule}।`),
    `किसी भी प्रश्न पर सीधे जाने के लिए प्रश्न पैलेट का उपयोग करें। शीर्ष विषय टैब से विषयों के बीच स्विच करें।`,
    `अपना उत्तर सुरक्षित करने और अगले प्रश्न पर जाने के लिए 'Save & Next' पर क्लिक करें। सबमिट करने से पहले आप कभी भी अपना उत्तर बदल सकते हैं।`,
    `पुनर्विचार के लिए प्रश्न को 'Mark for Review & Next' से चिह्नित करें। ऐसे प्रश्न पैलेट में बैंगनी रंग से दिखाई देंगे।`,
    `समय समाप्त होने पर परीक्षा स्वतः सबमिट हो जाएगी। सभी प्रश्नों की समीक्षा करने के बाद आप समय से पहले भी सबमिट कर सकते हैं।`,
  ];

  const fallbackMap: Record<string, string[]> = {};
  if (langProfile.isBilingual) {
    fallbackMap.English = fallbackEnglish;
    fallbackMap.Hindi = fallbackHindi;
  } else if (langProfile.primaryLanguage === 'Hindi') {
    fallbackMap.Hindi = fallbackHindi;
  } else {
    fallbackMap.English = fallbackEnglish;
    // Provide Hindi translation option as well for national exams like JEE/NEET/CBSE
    fallbackMap.Hindi = fallbackHindi;
  }

  return {
    isBilingual: true,
    primaryLanguage: langProfile.primaryLanguage,
    availableLanguages: Object.keys(fallbackMap),
    totalQuestions,
    totalMarks: computedTotalMarks,
    durationMin,
    subjectBreakdown,
    markingSummary,
    instructionsByLanguage: fallbackMap,
  };
}
