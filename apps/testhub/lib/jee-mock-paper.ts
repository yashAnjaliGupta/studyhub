import type { ProcessedPaper, ProcessedQuestion, QuestionType } from './paper-service';

export const JEE_MAIN_DEFAULT_PAPER: ProcessedPaper = {
  id: 'jee-main-2025-practice',
  title: 'JEE Main 2025 Mock Test',
  subject: 'Physics, Chemistry, Mathematics',
  examType: 'JEE Main',
  year: 2025,
  totalMarks: 300,
  durationMin: 180,
  sourcePdfUrl: null,
  questions: [
    // --- CHEMISTRY (SECTION A): Q1 to Q20 (20 MCQs) ---
    {
      id: 'chem_sec_a_1',
      sequenceNum: 1,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'Which of the following orbital combinations results in a pi (π) bond formation assuming z-axis as the internuclear axis?',
      options: [
        { text: 'd_{xy} and d_{xy}', isCorrect: false, sequenceNum: 0 },
        { text: 'p_x and p_x', isCorrect: true, sequenceNum: 1 },
        { text: 'p_z and p_z', isCorrect: false, sequenceNum: 2 },
        { text: 's and p_z', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_2',
      sequenceNum: 2,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'The magnetic moment of [Fe(H_2O)_6]^{2+} (in Bohr Magnetons, BM) is approximately:',
      options: [
        { text: '0 BM', isCorrect: false, sequenceNum: 0 },
        { text: '2.84 BM', isCorrect: false, sequenceNum: 1 },
        { text: '4.90 BM', isCorrect: true, sequenceNum: 2 },
        { text: '5.92 BM', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_3',
      sequenceNum: 3,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'For a first-order reaction, the time required for 99.9% completion is approximately how many times the half-life (t_{1/2})?',
      options: [
        { text: '10 times', isCorrect: true, sequenceNum: 0 },
        { text: '5 times', isCorrect: false, sequenceNum: 1 },
        { text: '2 times', isCorrect: false, sequenceNum: 2 },
        { text: '8 times', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_4',
      sequenceNum: 4,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'The correct order of increasing basicity of methylamines in aqueous medium is:',
      options: [
        { text: '(CH_3)_3N < CH_3NH_2 < (CH_3)_2NH', isCorrect: true, sequenceNum: 0 },
        { text: 'CH_3NH_2 < (CH_3)_2NH < (CH_3)_3N', isCorrect: false, sequenceNum: 1 },
        { text: '(CH_3)_2NH < CH_3NH_2 < (CH_3)_3N', isCorrect: false, sequenceNum: 2 },
        { text: '(CH_3)_3N < (CH_3)_2NH < CH_3NH_2', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_5',
      sequenceNum: 5,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'Which of the following compounds exhibits optical isomerism without containing any asymmetric chiral carbon?',
      options: [
        { text: 'Lactic acid', isCorrect: false, sequenceNum: 0 },
        { text: 'Penta-2,3-diene', isCorrect: true, sequenceNum: 1 },
        { text: 'Tartaric acid', isCorrect: false, sequenceNum: 2 },
        { text: '2-Chlorobutane', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_6',
      sequenceNum: 6,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'Among the halogens, the correct order of bond dissociation enthalpy is:',
      options: [
        { text: 'Cl_2 > Br_2 > F_2 > I_2', isCorrect: true, sequenceNum: 0 },
        { text: 'F_2 > Cl_2 > Br_2 > I_2', isCorrect: false, sequenceNum: 1 },
        { text: 'Cl_2 > F_2 > Br_2 > I_2', isCorrect: false, sequenceNum: 2 },
        { text: 'Br_2 > Cl_2 > F_2 > I_2', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_7',
      sequenceNum: 7,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'The IUPAC name of the complex [Co(NH_3)_5(CO_3)]Cl is:',
      options: [
        { text: 'Pentaamminecarbonatocobalt(III) chloride', isCorrect: true, sequenceNum: 0 },
        { text: 'Carbonatopentaamminecobalt(III) chloride', isCorrect: false, sequenceNum: 1 },
        { text: 'Pentaamminecarbonatocobalt(II) chloride', isCorrect: false, sequenceNum: 2 },
        { text: 'Pentaamminechlorocobalt(III) carbonate', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_8',
      sequenceNum: 8,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'Which oxide of nitrogen is an anhydride of nitrous acid (HNO_2)?',
      options: [
        { text: 'N_2O', isCorrect: false, sequenceNum: 0 },
        { text: 'NO', isCorrect: false, sequenceNum: 1 },
        { text: 'N_2O_3', isCorrect: true, sequenceNum: 2 },
        { text: 'N_2O_5', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_9',
      sequenceNum: 9,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'The oxidation state of chromium in potassium dichromate (K_2Cr_2O_7) and chromyl chloride (CrO_2Cl_2) respectively are:',
      options: [
        { text: '+6 and +6', isCorrect: true, sequenceNum: 0 },
        { text: '+6 and +4', isCorrect: false, sequenceNum: 1 },
        { text: '+4 and +6', isCorrect: false, sequenceNum: 2 },
        { text: '+3 and +6', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_10',
      sequenceNum: 10,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'Predict the major product obtained when phenol is treated with chloroform and aqueous NaOH (Reimer-Tiemann reaction):',
      options: [
        { text: 'Salicylaldehyde', isCorrect: true, sequenceNum: 0 },
        { text: 'Salicylic acid', isCorrect: false, sequenceNum: 1 },
        { text: 'o-Cresol', isCorrect: false, sequenceNum: 2 },
        { text: 'p-Benzoquinone', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_11',
      sequenceNum: 11,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'Which of the following pairs forms an ideal solution over the entire range of composition?',
      options: [
        { text: 'Benzene + Toluene', isCorrect: true, sequenceNum: 0 },
        { text: 'Ethanol + Water', isCorrect: false, sequenceNum: 1 },
        { text: 'Chloroform + Acetone', isCorrect: false, sequenceNum: 2 },
        { text: 'Phenol + Aniline', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_12',
      sequenceNum: 12,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'The molar conductivity of 0.025 mol L^{-1} methanoic acid is 46.1 S cm^2 mol^{-1}. Given \\Lambda^o_{m(H^+)} = 349.6 and \\Lambda^o_{m(HCOO^-)} = 54.6 S cm^2 mol^{-1}, its degree of dissociation (\\alpha) is:',
      options: [
        { text: '0.114', isCorrect: true, sequenceNum: 0 },
        { text: '0.228', isCorrect: false, sequenceNum: 1 },
        { text: '0.057', isCorrect: false, sequenceNum: 2 },
        { text: '0.342', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_13',
      sequenceNum: 13,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'Which of the following compounds gives a positive iodoform test?',
      options: [
        { text: 'Pentan-3-one', isCorrect: false, sequenceNum: 0 },
        { text: 'Pentan-2-one', isCorrect: true, sequenceNum: 1 },
        { text: 'Benzophenone', isCorrect: false, sequenceNum: 2 },
        { text: '3-Methylbutan-2-ol', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_14',
      sequenceNum: 14,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'Cannizzaro reaction is not shown by which of the following aldehydes?',
      options: [
        { text: 'Formaldehyde', isCorrect: false, sequenceNum: 0 },
        { text: 'Acetaldehyde', isCorrect: true, sequenceNum: 1 },
        { text: 'Benzaldehyde', isCorrect: false, sequenceNum: 2 },
        { text: 'Trimethylacetaldehyde', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_15',
      sequenceNum: 15,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'The linkage present in amylose chain of starch is:',
      options: [
        { text: '\\alpha(1 \\rightarrow 4) glycosidic linkage', isCorrect: true, sequenceNum: 0 },
        { text: '\\beta(1 \\rightarrow 4) glycosidic linkage', isCorrect: false, sequenceNum: 1 },
        { text: '\\alpha(1 \\rightarrow 6) glycosidic linkage', isCorrect: false, sequenceNum: 2 },
        { text: '\\beta(1 \\rightarrow 6) glycosidic linkage', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_16',
      sequenceNum: 16,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'Which reagent can best distinguish between hex-1-yne and hex-2-yne?',
      options: [
        { text: 'Br_2 / CCl_4', isCorrect: false, sequenceNum: 0 },
        { text: 'Ammoniacal AgNO_3 (Tollens reagent)', isCorrect: true, sequenceNum: 1 },
        { text: 'KMnO_4 in acidic medium', isCorrect: false, sequenceNum: 2 },
        { text: 'Cold dilute alkaline KMnO_4 (Baeyer reagent)', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_17',
      sequenceNum: 17,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'Among the lanthanoids, which ion is diamagnetic?',
      options: [
        { text: 'Ce^{3+}', isCorrect: false, sequenceNum: 0 },
        { text: 'Sm^{3+}', isCorrect: false, sequenceNum: 1 },
        { text: 'Eu^{3+}', isCorrect: false, sequenceNum: 2 },
        { text: 'Lu^{3+}', isCorrect: true, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_18',
      sequenceNum: 18,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'What is the hybridisation and geometry of XeF_4 molecule?',
      options: [
        { text: 'sp^3d^2, Square planar', isCorrect: true, sequenceNum: 0 },
        { text: 'sp^3d, See-saw', isCorrect: false, sequenceNum: 1 },
        { text: 'sp^3, Tetrahedral', isCorrect: false, sequenceNum: 2 },
        { text: 'sp^3d^2, Octahedral', isCorrect: false, sequenceNum: 3 },
      ],
    },
    {
      id: 'chem_sec_a_19',
      sequenceNum: 19,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: 'The standard Gibbs free energy change (\\Delta G^o) of a cell reaction is related to standard cell potential (E^o_{cell}) by:',
      options: [
        { text: '\\Delta G^o = -nFE^o_{cell}', isCorrect: true, sequenceNum: 0 },
        { text: '\\Delta G^o = +nFE^o_{cell}', isCorrect: false, sequenceNum: 1 },
        { text: '\\Delta G^o = -RT \\ln(E^o_{cell})', isCorrect: false, sequenceNum: 2 },
        { text: '\\Delta G^o = -nFE^o_{cell} / RT', isCorrect: false, sequenceNum: 3 },
      ],
    },
    // EXACT QUESTION FROM USER SCREENSHOT (Q20):
    {
      id: 'chem_sec_a_20',
      sequenceNum: 20,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single',
      text: `Consider the following molecules:

$$\\begin{array}{cc}
\\mathbf{(p)} & \\mathrm{CH_3-CH_2-C(=O)-Cl} \\\\[6pt]
\\mathbf{(q)} & \\mathrm{CH_3-CH_2-C(=O)-O-C(=O)-CH_3} \\\\[6pt]
\\mathbf{(r)} & \\mathrm{CH_3-CH_2-C(=O)-O-CH_2-CH_3} \\\\[6pt]
\\mathbf{(s)} & \\mathrm{CH_3-CH_2-C(=O)-NH_2}
\\end{array}$$

The correct order of rate of hydrolysis is :`,
      diagramSvg: `<svg viewBox="0 0 760 210" xmlns="http://www.w3.org/2000/svg" style="font-family: 'Times New Roman', serif; font-size: 19px; fill: #111;">
  <!-- Molecule p -->
  <g transform="translate(40, 25)">
    <text x="0" y="55">CH<tspan dy="5" font-size="13">3</tspan><tspan dy="-5">—CH</tspan><tspan dy="5" font-size="13">2</tspan><tspan dy="-5">—C—Cl</tspan></text>
    <line x1="126" y1="36" x2="126" y2="18" stroke="#111" stroke-width="2"/>
    <line x1="130" y1="36" x2="130" y2="18" stroke="#111" stroke-width="2"/>
    <text x="122" y="14">O</text>
    <text x="80" y="86" font-style="italic">(p)</text>
  </g>

  <!-- Molecule q -->
  <g transform="translate(240, 25)">
    <text x="0" y="55">CH<tspan dy="5" font-size="13">3</tspan><tspan dy="-5">—CH</tspan><tspan dy="5" font-size="13">2</tspan><tspan dy="-5">—C—O—C—CH</tspan><tspan dy="5" font-size="13">3</tspan></text>
    <line x1="126" y1="36" x2="126" y2="18" stroke="#111" stroke-width="2"/>
    <line x1="130" y1="36" x2="130" y2="18" stroke="#111" stroke-width="2"/>
    <text x="122" y="14">O</text>
    <line x1="184" y1="36" x2="184" y2="18" stroke="#111" stroke-width="2"/>
    <line x1="188" y1="36" x2="188" y2="18" stroke="#111" stroke-width="2"/>
    <text x="180" y="14">O</text>
    <text x="125" y="86" font-style="italic">(q)</text>
  </g>

  <!-- Molecule r -->
  <g transform="translate(40, 125)">
    <text x="0" y="55">CH<tspan dy="5" font-size="13">3</tspan><tspan dy="-5">—CH</tspan><tspan dy="5" font-size="13">2</tspan><tspan dy="-5">—C—O—CH</tspan><tspan dy="5" font-size="13">2</tspan><tspan dy="-5">—CH</tspan><tspan dy="5" font-size="13">3</tspan></text>
    <line x1="126" y1="36" x2="126" y2="18" stroke="#111" stroke-width="2"/>
    <line x1="130" y1="36" x2="130" y2="18" stroke="#111" stroke-width="2"/>
    <text x="122" y="14">O</text>
    <text x="100" y="86" font-style="italic">(r)</text>
  </g>

  <!-- Molecule s -->
  <g transform="translate(340, 125)">
    <text x="0" y="55">CH<tspan dy="5" font-size="13">3</tspan><tspan dy="-5">—CH</tspan><tspan dy="5" font-size="13">2</tspan><tspan dy="-5">—C—NH</tspan><tspan dy="5" font-size="13">2</tspan></text>
    <line x1="126" y1="36" x2="126" y2="18" stroke="#111" stroke-width="2"/>
    <line x1="130" y1="36" x2="130" y2="18" stroke="#111" stroke-width="2"/>
    <text x="122" y="14">O</text>
    <text x="80" y="86" font-style="italic">(s)</text>
  </g>
</svg>`,
      options: [
        { text: 'p > q > r > s', isCorrect: true, sequenceNum: 0 },
        { text: 'q > p > r > s', isCorrect: false, sequenceNum: 1 },
        { text: 'p > r > q > s', isCorrect: false, sequenceNum: 2 },
        { text: 's > r > q > p', isCorrect: false, sequenceNum: 3 },
      ],
    },

    // --- CHEMISTRY (SECTION B): Q21 to Q25 (Numerical) ---
    {
      id: 'chem_sec_b_21',
      sequenceNum: 21,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'numerical',
      text: 'Calculate the total number of unpaired electrons in [Mn(CN)_6]^{3-} complex ion.',
      options: [{ text: '2', isCorrect: true, sequenceNum: 0 }],
    },
    {
      id: 'chem_sec_b_22',
      sequenceNum: 22,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'numerical',
      text: 'The freezing point depression constant (K_f) of water is 1.86 K kg mol^{-1}. If 34.2 g of sucrose (molar mass = 342 g/mol) is dissolved in 1000 g of water, the freezing point depression (in K) is (round to 2 decimal places):',
      options: [{ text: '0.19', isCorrect: true, sequenceNum: 0 }],
    },
    {
      id: 'chem_sec_b_23',
      sequenceNum: 23,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'numerical',
      text: 'How many total optical and geometrical isomers exist for the complex [Co(en)_2Cl_2]^+ ?',
      options: [{ text: '3', isCorrect: true, sequenceNum: 0 }],
    },
    {
      id: 'chem_sec_b_24',
      sequenceNum: 24,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'numerical',
      text: 'The pH of a 0.005 M Ba(OH)_2 aqueous solution at 298 K is:',
      options: [{ text: '12', isCorrect: true, sequenceNum: 0 }],
    },
    {
      id: 'chem_sec_b_25',
      sequenceNum: 25,
      topic: 'Chemistry',
      marks: 4,
      negativeMarks: 1,
      type: 'numerical',
      text: 'For the reaction A + 2B -> C, the rate law is rate = k[A]^1[B]^2. If the volume of the reaction vessel is halved, the rate of reaction increases by a factor of:',
      options: [{ text: '8', isCorrect: true, sequenceNum: 0 }],
    },

    // --- MATHEMATICS (SECTION A): Q26 to Q45 (20 MCQs) ---
    ...Array.from({ length: 20 }, (_, idx) => ({
      id: `math_sec_a_${idx + 26}`,
      sequenceNum: idx + 26,
      topic: 'Mathematics',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single' as const,
      text: `Let f(x) = x^3 - 3x^2 + 6x - 7. The number of real roots of equation f'(x) = 0 is : (Question ${idx + 26})`,
      options: [
        { text: '0 (No real roots)', isCorrect: true, sequenceNum: 0 },
        { text: '1', isCorrect: false, sequenceNum: 1 },
        { text: '2', isCorrect: false, sequenceNum: 2 },
        { text: '3', isCorrect: false, sequenceNum: 3 },
      ],
    })),

    // --- MATHEMATICS (SECTION B): Q46 to Q50 (Numerical) ---
    ...Array.from({ length: 5 }, (_, idx) => ({
      id: `math_sec_b_${idx + 46}`,
      sequenceNum: idx + 46,
      topic: 'Mathematics',
      marks: 4,
      negativeMarks: 1,
      type: 'numerical' as const,
      text: `Evaluate the integral: \\int_0^{\\pi/2} \\frac{\\sin^3 x}{\\sin^3 x + \\cos^3 x} dx. Find the value of \\frac{4}{\\pi} \\times I. (Question ${idx + 46})`,
      options: [{ text: '1', isCorrect: true, sequenceNum: 0 }],
    })),

    // --- PHYSICS (SECTION A): Q51 to Q70 (20 MCQs) ---
    ...Array.from({ length: 20 }, (_, idx) => ({
      id: `phys_sec_a_${idx + 51}`,
      sequenceNum: idx + 51,
      topic: 'Physics',
      marks: 4,
      negativeMarks: 1,
      type: 'mcq_single' as const,
      text: `A block of mass 2 kg is placed on an inclined plane of inclination 30°. If the coefficient of static friction is 0.6, find the friction force acting on the block (take g = 10 m/s^2). (Question ${idx + 51})`,
      options: [
        { text: '10 N', isCorrect: true, sequenceNum: 0 },
        { text: '10.39 N', isCorrect: false, sequenceNum: 1 },
        { text: '17.32 N', isCorrect: false, sequenceNum: 2 },
        { text: '0 N', isCorrect: false, sequenceNum: 3 },
      ],
    })),

    // --- PHYSICS (SECTION B): Q71 to Q75 (Numerical) ---
    ...Array.from({ length: 5 }, (_, idx) => ({
      id: `phys_sec_b_${idx + 71}`,
      sequenceNum: idx + 71,
      topic: 'Physics',
      marks: 4,
      negativeMarks: 1,
      type: 'numerical' as const,
      text: `A particle executes SHM with an amplitude of 10 cm and time period 4 s. Find its speed (in cm/s) when displacement is 6 cm from mean position. (Take \\pi = 3.14). (Question ${idx + 71})`,
      options: [{ text: '12.56', isCorrect: true, sequenceNum: 0 }],
    })),
  ].map((q, idx) => {
    let subject = 'Chemistry';
    let section = 'Section A';
    if (idx < 20) {
      subject = 'Chemistry';
      section = 'Section A';
    } else if (idx < 25) {
      subject = 'Chemistry';
      section = 'Section B';
    } else if (idx < 45) {
      subject = 'Mathematics';
      section = 'Section A';
    } else if (idx < 50) {
      subject = 'Mathematics';
      section = 'Section B';
    } else if (idx < 70) {
      subject = 'Physics';
      section = 'Section A';
    } else {
      subject = 'Physics';
      section = 'Section B';
    }
    return {
      ...q,
      type: (q.type || 'mcq_single') as QuestionType,
      subject,
      section,
      sectionName: `${subject} (${section})`,
    };
  }),
};

// Default initial state mimicking user screenshot exactly!
export const INITIAL_MOCK_STATE = {
  // Q1 to Q13 answered
  answers: {
    chem_sec_a_1: 1,
    chem_sec_a_2: 2,
    chem_sec_a_3: 0,
    chem_sec_a_4: 0,
    chem_sec_a_5: 1,
    chem_sec_a_6: 0,
    chem_sec_a_7: 0,
    chem_sec_a_8: 2,
    chem_sec_a_9: 0,
    chem_sec_a_10: 0,
    chem_sec_a_11: 0,
    chem_sec_a_12: 0,
    chem_sec_a_13: 1,
    chem_sec_a_14: 1, // answered & marked for review!
    // Q15 is only marked for review (no answer)
    // Q16, Q17 are visited but not answered
    chem_sec_a_18: 0,
    chem_sec_a_19: 0,
  } as Record<string, any>,
  // Review set: Q14 (answered & review) and Q15 (review only)
  review: new Set(['chem_sec_a_14', 'chem_sec_a_15']),
  // Visited set: Q1 through Q20
  visited: new Set([
    'chem_sec_a_1',
    'chem_sec_a_2',
    'chem_sec_a_3',
    'chem_sec_a_4',
    'chem_sec_a_5',
    'chem_sec_a_6',
    'chem_sec_a_7',
    'chem_sec_a_8',
    'chem_sec_a_9',
    'chem_sec_a_10',
    'chem_sec_a_11',
    'chem_sec_a_12',
    'chem_sec_a_13',
    'chem_sec_a_14',
    'chem_sec_a_15',
    'chem_sec_a_16',
    'chem_sec_a_17',
    'chem_sec_a_18',
    'chem_sec_a_19',
    'chem_sec_a_20',
  ]),
};
