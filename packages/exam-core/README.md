# 📝 Exam Core Domain Models (`@repo/exam-core`)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue?logo=typescript)](https://www.typescriptlang.org/)
[![CBT Standards](https://img.shields.io/badge/Exam-CBT%20Standard%20Schema-0875f9)](https://github.com/)

The `@repo/exam-core` package defines the canonical TypeScript models, type definitions, scoring specifications, and topic taxonomy that drive the computer-based testing engine in `apps/testhub` and ingestion pipelines in `scripts/pyq-pipeline`.

---

## 🏛️ Domain Models (`models.ts`)

### `Question`
```typescript
export interface Question {
  id: string;
  paperId?: string | null;
  sequenceNum?: number | null;
  topicId?: string | null;
  subject?: string | null;
  text: string;
  imageUrl?: string | null;
  diagramSvg?: string | null;
  type?: "mcq_single" | "mcq_multiple" | "numerical" | "text_subjective";
  options: QuestionOption[];
  correctOptionIds?: string[];
  numericalAnswer?: {
    value: number;
    tolerance?: number;
    range?: [number, number];
  };
  solutionText?: string | null;
  solutionSvg?: string | null;
  marks: number;
  negativeMarks: number;
}
```

### `ExamAttempt` & `ExamConfig`
Tracks student progress during live mock tests:
```typescript
export interface ExamAttempt {
  id: string;
  studentId: string;
  paperId: string;
  status: 'CREATED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EVALUATED' | 'INSIGHTS_AVAILABLE';
  startedAt: Date;
  submittedAt?: Date;
  evaluatedAt?: Date;
  config: {
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    durationMinutes: number;
    isTimedSimulation: boolean;
  };
}
```

---

## 📚 Subject Taxonomy (`topics.ts`)

Standardized topic categories across national competitive exams:

- **Physics**: Mechanics, Thermodynamics, Waves & Oscillations, Electromagnetism, Optics, Modern Physics.
- **Chemistry**: Physical Chemistry (Equilibrium, Kinetics, Thermodynamics), Inorganic Chemistry (Coordination Compounds, Periodic Table), Organic Chemistry (Hydrocarbons, Reaction Mechanisms).
- **Mathematics**: Calculus, Algebra, Coordinate Geometry, Trigonometry, Vectors & 3D Geometry.
- **Biology**: Botany, Zoology, Cell Biology, Genetics, Ecology, Human Physiology.

