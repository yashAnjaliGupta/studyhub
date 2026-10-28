export const OFFICIAL_SYLLABUS_TOPICS: Record<string, string[]> = {
  Physics: [
    'Units and Measurements',
    'Mathematical Tools and Vectors',
    'Motion in a Straight Line',
    'Motion in a Plane',
    'Laws of Motion',
    'Work, Energy and Power',
    'System of Particles and Centre of Mass',
    'Rotational Motion',
    'Gravitation',
    'Mechanical Properties of Solids',
    'Mechanical Properties of Fluids',
    'Thermal Properties of Matter',
    'Thermodynamics',
    'Kinetic Theory of Gases',
    'Oscillations',
    'Waves',
    'Electric Charges and Fields',
    'Electrostatic Potential and Capacitance',
    'Current Electricity',
    'Moving Charges and Magnetism',
    'Magnetism and Matter',
    'Electromagnetic Induction',
    'Alternating Current',
    'Electromagnetic Waves',
    'Ray Optics and Optical Instruments',
    'Wave Optics',
    'Dual Nature of Radiation and Matter',
    'Atoms',
    'Nuclei',
    'Semiconductor Electronics',
    'Experimental Skills',
  ],
  Chemistry: [
    'Some Basic Concepts of Chemistry',
    'Atomic Structure',
    'Chemical Bonding and Molecular Structure',
    'Classification of Elements and Periodicity in Properties',
    'Chemical Thermodynamics',
    'Solutions',
    'Equilibrium',
    'Redox Reactions',
    'Electrochemistry',
    'Chemical Kinetics',
    'p-Block Elements',
    'd- and f-Block Elements',
    'Coordination Compounds',
    'Purification and Characterisation of Organic Compounds',
    'Some Basic Principles of Organic Chemistry',
    'Hydrocarbons',
    'Organic Compounds Containing Halogens',
    'Organic Compounds Containing Oxygen',
    'Organic Compounds Containing Nitrogen',
    'Biomolecules',
    'Principles Related to Practical Chemistry',
  ],
  Mathematics: [
    'Sets',
    'Relations and Functions',
    'Trigonometric Functions, Identities and Equations',
    'Complex Numbers and Quadratic Equations',
    'Permutations and Combinations',
    'Binomial Theorem',
    'Sequences and Series',
    'Straight Lines',
    'Circles',
    'Conic Sections',
    'Limits, Continuity and Differentiability',
    'Differentiation',
    'Applications of Derivatives',
    'Indefinite Integration',
    'Definite Integration',
    'Area Under Curves',
    'Differential Equations',
    'Matrices',
    'Determinants',
    'Vector Algebra',
    'Three-Dimensional Geometry',
    'Probability',
    'Statistics',
  ],
  Biology: [
    'The Living World',
    'Biological Classification',
    'Plant Kingdom',
    'Animal Kingdom',
    'Morphology of Flowering Plants',
    'Anatomy of Flowering Plants',
    'Structural Organisation in Animals',
    'Cell: The Unit of Life',
    'Cell Cycle and Cell Division',
    'Photosynthesis in Higher Plants',
    'Respiration in Plants',
    'Plant Growth and Development',
    'Breathing and Exchange of Gases',
    'Body Fluids and Circulation',
    'Excretory Products and Their Elimination',
    'Locomotion and Movement',
    'Neural Control and Coordination',
    'Chemical Coordination and Integration',
    'Sexual Reproduction in Flowering Plants',
    'Human Reproduction',
    'Reproductive Health',
    'Principles of Inheritance and Variation',
    'Molecular Basis of Inheritance',
    'Evolution',
    'Human Health and Disease',
    'Microbes in Human Welfare',
    'Biotechnology: Principles and Processes',
    'Biotechnology and Its Applications',
    'Organisms and Populations',
    'Ecosystem',
    'Biodiversity and Conservation',
    'Anatomy',
    'Physiology',
    'Biochemistry',
    'Pathology',
    'Pharmacology',
    'Microbiology',
    'Forensic Medicine and Toxicology',
    'Community Medicine / Preventive and Social Medicine',
    'General Medicine',
    'General Surgery',
    'Obstetrics and Gynaecology',
    'Paediatrics',
    'Ophthalmology',
    'Otorhinolaryngology (ENT)',
    'Orthopaedics',
    'Dermatology',
    'Psychiatry',
    'Anaesthesiology',
    'Radiodiagnosis',
  ],
};

export function getTopicsForSubject(subject?: string | null): string[] {
  const s = (subject || '').trim().toLowerCase();
  if (s.includes('phys')) return OFFICIAL_SYLLABUS_TOPICS['Physics']!;
  if (s.includes('chem')) return OFFICIAL_SYLLABUS_TOPICS['Chemistry']!;
  if (s.includes('math')) return OFFICIAL_SYLLABUS_TOPICS['Mathematics']!;
  if (s.includes('bio') || s.includes('botany') || s.includes('zoology') || s.includes('neet') || s.includes('medical')) {
    return OFFICIAL_SYLLABUS_TOPICS['Biology']!;
  }
  // Return combined list if subject is generic or unknown
  return Object.values(OFFICIAL_SYLLABUS_TOPICS).flat();
}

export function normalizeTopic(rawTopic?: string | null, subject?: string | null): string {
  if (!rawTopic || !rawTopic.trim()) {
    const list = getTopicsForSubject(subject);
    return list[0] || 'General Concepts';
  }

  let clean = rawTopic.trim().replace(/^["']|["']$/g, '');
  // Remove leading numbering like "1.", "1)", "Chapter 1:"
  clean = clean.replace(/^(?:chapter\s+)?\d+[\.:\)\s-]+\s*/i, '').trim();

  const validTopics = getTopicsForSubject(subject);
  const lowerMap = new Map<string, string>();
  for (const t of validTopics) {
    lowerMap.set(t.toLowerCase(), t);
  }

  // 1. Exact match (case-insensitive)
  if (lowerMap.has(clean.toLowerCase())) {
    return lowerMap.get(clean.toLowerCase())!;
  }

  // 2. Substring match
  const cleanLow = clean.toLowerCase();
  for (const t of validTopics) {
    const tLow = t.toLowerCase();
    if (tLow.includes(cleanLow) || cleanLow.includes(tLow)) {
      return t;
    }
  }

  // 3. Word overlap match
  const cleanWords = new Set(cleanLow.split(/\W+/).filter(w => !['and', 'of', 'in', 'the', 'to', 'for', 'a', 'an', ''].includes(w)));
  let bestMatch: string | null = null;
  let bestOverlap = 0;

  for (const t of validTopics) {
    const tWords = new Set(t.toLowerCase().split(/\W+/).filter(w => !['and', 'of', 'in', 'the', 'to', 'for', 'a', 'an', ''].includes(w)));
    let overlap = 0;
    for (const w of cleanWords) {
      if (tWords.has(w)) overlap++;
    }
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestMatch = t;
    }
  }

  if (bestMatch && bestOverlap > 0) {
    return bestMatch;
  }

  return clean || 'General Concepts';
}
