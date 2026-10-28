export type QuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'NUMERICAL'
  | 'INTEGER'
  | 'DECIMAL'
  | 'TEXT'
  | 'DESCRIPTIVE'
  | 'SHORT_ANSWER'
  | 'LONG_ANSWER'
  | 'ASSERTION_REASON'
  | 'MATCHING'
  | 'MATRIX_MATCH'
  | 'FILL_IN_THE_BLANK'
  | 'TRUE_FALSE'
  | 'PASSAGE_BASED'
  | 'COMPREHENSION'
  | 'SUBJECTIVE'
  | 'UNKNOWN'
  | 'OTHER';

export interface AssetRef {
  assetId?: string | null;
  pageNumber?: number | null;
  description?: string | null;
}

export interface ContentBlock {
  type?: string | null;
  value?: string | null;
  assetId?: string | null;
  format?: string | null;
  metadata?: Record<string, any>;
}

export interface CanonicalOption {
  label?: string | number | null;
  text?: string | null;
  content?: ContentBlock[];
  images?: AssetRef[];
  isCorrect?: boolean | null;
  metadata?: Record<string, any>;
}

export interface CanonicalQuestion {
  id?: string | null;
  number?: number | string | null;
  type?: QuestionType | null;
  question?: string | null;
  questionParts?: ContentBlock[];
  options: CanonicalOption[];
  passage?: string | null;
  instructions?: string[];
  marks?: number | null;
  negativeMarks?: number | null;
  answer?: string | number | boolean | any[] | null;
  answerType?: string | null;
  images?: AssetRef[];
  sourcePages?: number[];
  sourceQuestionNumber?: string | null;
  subject?: string | null;
  confidence?: number | null;
  reviewStatus?: 'NOT_REVIEWED' | 'REVIEW_REQUIRED' | 'VERIFIED' | 'LOW_CONFIDENCE' | null;
  metadata?: Record<string, any>;
}

export interface CanonicalSection {
  number?: number | string | null;
  title?: string | null;
  code?: string | null;
  instructions: string[];
  questionType?: QuestionType | null;
  maximumMarks?: number | null;
  marksPerQuestion?: number | null;
  negativeMarks?: number | null;
  questions: CanonicalQuestion[];
  sourcePages?: number[];
  metadata?: Record<string, any>;
}

export interface CanonicalSubject {
  name?: string | null;
  code?: string | null;
  instructions: string[];
  maximumMarks?: number | null;
  sections: CanonicalSection[];
  questions: CanonicalQuestion[];
  metadata?: Record<string, any>;
}

export interface CanonicalExam {
  name?: string | null;
  examType?: string | null;
  year?: number | null;
  paper?: string | null;
  paperCode?: string | null;
  language?: string | null;
  sourceFile?: string | null;
  durationMinutes?: number | null;
  maximumMarks?: number | null;
  totalQuestions?: number | null;
  sourcePages?: number[];
  metadata?: Record<string, any>;
}

export interface CanonicalAsset {
  id?: string | null;
  type?: 'image' | 'diagram' | 'table' | 'other' | null;
  url?: string | null;
  pageNumber?: number | null;
  description?: string | null;
  bbox?: number[] | null;
  metadata?: Record<string, any>;
}

export interface CanonicalExamPaper {
  schemaVersion: '1.0';
  exam: CanonicalExam;
  subjects: CanonicalSubject[];
  sections: CanonicalSection[];
  questions: CanonicalQuestion[];
  instructions: string[];
  assets: CanonicalAsset[];
  metadata?: Record<string, any>;
}

export interface ParseServiceResponse {
  success: boolean;
  paper?: CanonicalExamPaper | null;
  errors: string[];
  processingTimeMs: number;
  detectedLayout?: any;
  plannerBlueprint?: any;
  generatedPdfPath?: string | null;
  debugJsonPath?: string | null;
}

const PARSER_SERVICE_URL = process.env.PDF_PARSER_SERVICE_URL || 'http://localhost:8001';

/**
 * Calls the dedicated Python PDF Parsing service to normalize any exam PDF
 * into TestHub's Stable Canonical Exam Paper Schema v1.0.
 */
export async function parsePdfWithService(params: {
  pdfPath?: string;
  pdfUrl?: string;
  paperId?: string;
  paperTitle?: string;
  examName?: string;
  examType?: string;
  year?: number;
  subject?: string;
}): Promise<ParseServiceResponse> {
  try {
    const res = await fetch(`${PARSER_SERVICE_URL}/api/v1/parse-paper`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(60000), // 60s timeout for parallel workers
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        paper: null,
        errors: [`PDF Parser service returned ${res.status}: ${errText}`],
        processingTimeMs: 0,
      };
    }

    const data: ParseServiceResponse = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      paper: null,
      errors: [err?.message || 'Failed to connect to PDF Parser service'],
      processingTimeMs: 0,
    };
  }
}
