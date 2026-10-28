import type { ProcessedPaper, ProcessedQuestion } from './paper-service';
import { mockPapers, getMockPaper } from './mock-data';
import { JEE_MAIN_DEFAULT_PAPER } from './jee-mock-paper';

/**
 * Generates dynamic questions tailored to the requested paper's subject, examType, and year.
 */
export function getDynamicPaper(idOrRef: string): ProcessedPaper {
  const decodedId = decodeURIComponent(idOrRef).trim();

  // 1. If it's the default 3-subject mock paper or jee-main-2025
  if (decodedId === 'jee-main-2025-practice' || decodedId === 'jee-main-2025' || decodedId === 'practice') {
    return JEE_MAIN_DEFAULT_PAPER;
  }

  // 2. Check if it matches a predefined paper in mockPapers
  const meta = getMockPaper(decodedId);
  const examType = meta.examType || 'JEE Main';
  const subject = meta.subject || examType;
  const year = meta.year || 2024;

  const isJee = examType.toLowerCase().includes('jee') || decodedId.toLowerCase().includes('jee');

  if (!isJee && subject.toLowerCase().includes('phys')) {
    return generatePhysicsPaper(decodedId, meta.title, examType, year);
  } else if (!isJee && subject.toLowerCase().includes('bio')) {
    return generateBiologyPaper(decodedId, meta.title, examType, year);
  } else if (!isJee && subject.toLowerCase().includes('math')) {
    return generateMathPaper(decodedId, meta.title, examType, year);
  } else if (!isJee && subject.toLowerCase().includes('chem')) {
    return generateChemistryPaper(decodedId, meta.title, examType, year);
  }

  // Default to the full 3-subject paper
  return {
    ...JEE_MAIN_DEFAULT_PAPER,
    id: decodedId,
    title: meta.title,
    year,
    examType,
    subject: examType,
  };
}

/**
 * 30-Question Pure Physics Paper (20 MCQs in Section A, 10 Numerical in Section B)
 */
function generatePhysicsPaper(id: string, title: string, examType: string, year: number): ProcessedPaper {
  const secA: ProcessedQuestion[] = [
    {
      id: `${id}_q1`,
      sequenceNum: 1,
      topic: 'Kinematics',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'A projectile is launched from ground level at an angle \\theta = 45^\\circ with an initial speed of 20 m/s. Taking g = 10 m/s^2, the horizontal range is:',
      options: [
        { text: '40 m', isCorrect: true, sequenceNum: 0 },
        { text: '20 m', isCorrect: false, sequenceNum: 1 },
        { text: '80 m', isCorrect: false, sequenceNum: 2 },
        { text: '10 m', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: `${id}_q2`,
      sequenceNum: 2,
      topic: 'Laws of Motion',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'A block of mass 5 kg rests on a rough horizontal surface with coefficient of static friction \\mu_s = 0.4. A horizontal force of 15 N is applied to the block. (Take g = 10 m/s^2). The force of friction acting on the block is:',
      options: [
        { text: '15 N', isCorrect: true, sequenceNum: 0 },
        { text: '20 N', isCorrect: false, sequenceNum: 1 },
        { text: '0 N', isCorrect: false, sequenceNum: 2 },
        { text: '25 N', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: `${id}_q3`,
      sequenceNum: 3,
      topic: 'Rotational Motion',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'The ratio of radius of gyration of a solid sphere to that of a hollow sphere of the same mass and radius about their respective diameter axes is:',
      options: [
        { text: '\\sqrt{3} : \\sqrt{5}', isCorrect: true, sequenceNum: 0 },
        { text: '\\sqrt{2} : \\sqrt{3}', isCorrect: false, sequenceNum: 1 },
        { text: '2 : 5', isCorrect: false, sequenceNum: 2 },
        { text: '3 : 5', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: `${id}_q4`,
      sequenceNum: 4,
      topic: 'Electrostatics',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'Two point charges +q and -q are separated by a small distance 2a. The electric potential at any point on the equatorial plane of the dipole is:',
      options: [
        { text: 'Zero', isCorrect: true, sequenceNum: 0 },
        { text: '\\frac{q}{4\\pi \\epsilon_0 a}', isCorrect: false, sequenceNum: 1 },
        { text: '\\frac{2q}{4\\pi \\epsilon_0 a}', isCorrect: false, sequenceNum: 2 },
        { text: '\\infty', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: `${id}_q5`,
      sequenceNum: 5,
      topic: 'Current Electricity',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'In a Wheatstone bridge circuit with resistors P = 10\\,\\Omega, Q = 20\\,\\Omega, R = 15\\,\\Omega, the bridge is balanced. The resistance S is:',
      diagramSvg: `<svg viewBox="0 0 400 180" xmlns="http://www.w3.org/2000/svg" style="font-family: sans-serif; font-size: 14px; fill: #111;">
        <polygon points="200,20 320,90 200,160 80,90" fill="none" stroke="#2b78c5" stroke-width="2.5"/>
        <line x1="200" y1="20" x2="200" y2="160" stroke="#c0392b" stroke-width="1.5" stroke-dasharray="4"/>
        <text x="120" y="50" font-weight="bold">P = 10Ω</text>
        <text x="250" y="50" font-weight="bold">Q = 20Ω</text>
        <text x="120" y="140" font-weight="bold">R = 15Ω</text>
        <text x="250" y="140" font-weight="bold">S = ?</text>
        <circle cx="200" cy="90" r="16" fill="#fff" stroke="#111" stroke-width="1.5"/>
        <text x="195" y="95" font-weight="bold">G</text>
      </svg>`,
      options: [
        { text: '30 \\Omega', isCorrect: true, sequenceNum: 0 },
        { text: '25 \\Omega', isCorrect: false, sequenceNum: 1 },
        { text: '15 \\Omega', isCorrect: false, sequenceNum: 2 },
        { text: '40 \\Omega', isCorrect: false, sequenceNum: 3 },
      ],
    },
    ...Array.from({ length: 15 }, (_, i) => ({
      id: `${id}_q${i + 6}`,
      sequenceNum: i + 6,
      topic: ['Optics', 'Thermodynamics', 'Modern Physics', 'Magnetism', 'Wave Optics', 'Gravitation'][i % 6],
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single' as const,
      text: `Physics Concept Question ${i + 6}: A monochromatic light beam of wavelength \\lambda = 600\\text{ nm} is incident normally on a slit of width 0.1 mm. Find the angular width of the central maximum.`,
      options: [
        { text: '1.2 \\times 10^{-2} \\text{ rad}', isCorrect: true, sequenceNum: 0 },
        { text: '0.6 \\times 10^{-2} \\text{ rad}', isCorrect: false, sequenceNum: 1 },
        { text: '2.4 \\times 10^{-2} \\text{ rad}', isCorrect: false, sequenceNum: 2 },
        { text: '3.6 \\times 10^{-2} \\text{ rad}', isCorrect: false, sequenceNum: 3 },
      ],
    })),
  ];

  const secB: ProcessedQuestion[] = Array.from({ length: 10 }, (_, i) => ({
    id: `${id}_qb_${i + 21}`,
    sequenceNum: i + 21,
    topic: ['Modern Physics', 'Electrostatics', 'Current Electricity', 'Thermodynamics'][i % 4],
    marks: 4,
    negativeMarks: 1,
    type: 'numerical' as const,
    text: `Numerical Question ${i + 21}: An electron is accelerated through a potential difference of 100 V. Calculate its de-Broglie wavelength in Angstroms (\\AA). Round to two decimal places.`,
    options: [{ text: '1.23', isCorrect: true, sequenceNum: 0 }],
  }));

  return {
    id,
    title,
    subject: 'Physics',
    examType,
    year,
    totalMarks: 120,
    durationMin: 180,
    sourcePdfUrl: null,
    questions: [
      ...secA.map((q) => ({
        ...q,
        subject: 'Physics',
        section: 'Section A',
        sectionName: 'Physics (Section A)',
      })),
      ...secB.map((q) => ({
        ...q,
        subject: 'Physics',
        section: 'Section B',
        sectionName: 'Physics (Section B)',
      })),
    ],
  };
}

/**
 * 45-Question Pure Biology Paper (Botany & Zoology)
 */
function generateBiologyPaper(id: string, title: string, examType: string, year: number): ProcessedPaper {
  const questions: ProcessedQuestion[] = [
    {
      id: `${id}_q1`,
      sequenceNum: 1,
      topic: 'Cell Biology',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'Which organelle is known as the "powerhouse of the cell" and possesses its own circular DNA and 70S ribosomes?',
      options: [
        { text: 'Mitochondria', isCorrect: true, sequenceNum: 0 },
        { text: 'Chloroplast', isCorrect: false, sequenceNum: 1 },
        { text: 'Ribosome', isCorrect: false, sequenceNum: 2 },
        { text: 'Golgi Apparatus', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: `${id}_q2`,
      sequenceNum: 2,
      topic: 'Genetics',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'In Mendelian genetics, what is the phenotypic ratio obtained in the F2 generation of a classic monohybrid cross?',
      options: [
        { text: '3 : 1', isCorrect: true, sequenceNum: 0 },
        { text: '1 : 2 : 1', isCorrect: false, sequenceNum: 1 },
        { text: '9 : 3 : 3 : 1', isCorrect: false, sequenceNum: 2 },
        { text: '1 : 1 : 1 : 1', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: `${id}_q3`,
      sequenceNum: 3,
      topic: 'Human Physiology',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'Which enzyme is secreted by the juxtaglomerular cells in response to low arterial blood pressure?',
      options: [
        { text: 'Renin', isCorrect: true, sequenceNum: 0 },
        { text: 'Rennin', isCorrect: false, sequenceNum: 1 },
        { text: 'Angiotensinogen', isCorrect: false, sequenceNum: 2 },
        { text: 'Erythropoietin', isCorrect: false, sequenceNum: 3 },
      ],
    },
    ...Array.from({ length: 42 }, (_, i) => ({
      id: `${id}_q${i + 4}`,
      sequenceNum: i + 4,
      topic: ['Plant Physiology', 'Human Physiology', 'Genetics', 'Ecology', 'Cell Biology'][i % 5],
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single' as const,
      text: `Biology Concept Question ${i + 4}: During the Calvin cycle of photosynthesis, the primary CO2 acceptor molecule is:`,
      options: [
        { text: 'Ribulose-1,5-bisphosphate (RuBP)', isCorrect: true, sequenceNum: 0 },
        { text: 'Phosphoenolpyruvate (PEP)', isCorrect: false, sequenceNum: 1 },
        { text: '3-PGA', isCorrect: false, sequenceNum: 2 },
        { text: 'Oxaloacetic acid (OAA)', isCorrect: false, sequenceNum: 3 },
      ],
    })),
  ];

  return {
    id,
    title,
    subject: 'Biology',
    examType,
    year,
    totalMarks: 180,
    durationMin: 60,
    sourcePdfUrl: null,
    questions: questions.map((q, i) => {
      const section = i < 35 ? 'Section A' : 'Section B';
      return {
        ...q,
        subject: 'Biology',
        section,
        sectionName: `Biology (${section})`,
      };
    }),
  };
}

/**
 * 30-Question Pure Mathematics Paper
 */
function generateMathPaper(id: string, title: string, examType: string, year: number): ProcessedPaper {
  const secA: ProcessedQuestion[] = Array.from({ length: 20 }, (_, i) => ({
    id: `${id}_math_q${i + 1}`,
    sequenceNum: i + 1,
    topic: ['Calculus', 'Algebra', 'Coordinate Geometry', 'Vectors', 'Trigonometry'][i % 5],
    marks: 4,
    negativeMarks: 1,
    type: 'mcq_single' as const,
    subject: 'Mathematics',
    section: 'Section A',
    sectionName: 'Mathematics (Section A)',
    text: `Mathematics Question ${i + 1}: Let A be a 3 \\times 3 non-singular matrix such that |A| = 4. What is the value of |\\text{adj}(\\text{adj}(A))|?`,
    options: [
      { text: '256', isCorrect: true, sequenceNum: 0 },
      { text: '64', isCorrect: false, sequenceNum: 1 },
      { text: '16', isCorrect: false, sequenceNum: 2 },
      { text: '1024', isCorrect: false, sequenceNum: 3 },
    ],
  }));

  const secB: ProcessedQuestion[] = Array.from({ length: 10 }, (_, i) => ({
    id: `${id}_math_qb_${i + 21}`,
    sequenceNum: i + 21,
    topic: 'Calculus',
    marks: 4,
    negativeMarks: 1,
    type: 'numerical' as const,
    subject: 'Mathematics',
    section: 'Section B',
    sectionName: 'Mathematics (Section B)',
    text: `Mathematics Numerical ${i + 21}: Find the value of \\lim_{x \\to 0} \\frac{\\sin(5x) - 5x}{x^3}. Round your answer to the nearest integer.`,
    options: [{ text: '-21', isCorrect: true, sequenceNum: 0 }],
  }));

  return {
    id,
    title,
    subject: 'Mathematics',
    examType,
    year,
    totalMarks: 120,
    durationMin: 90,
    sourcePdfUrl: null,
    questions: [...secA, ...secB],
  };
}

/**
 * 30-Question Pure Chemistry Paper
 */
function generateChemistryPaper(id: string, title: string, examType: string, year: number): ProcessedPaper {
  return {
    ...JEE_MAIN_DEFAULT_PAPER,
    id,
    title,
    subject: 'Chemistry',
    examType,
    year,
    totalMarks: 120,
    durationMin: 180,
    questions: JEE_MAIN_DEFAULT_PAPER.questions.slice(0, 30).map((q, i) => {
      const section = i < 20 ? 'Section A' : 'Section B';
      return {
        ...q,
        subject: 'Chemistry',
        section,
        sectionName: `Chemistry (${section})`,
      };
    }),
  };
}
