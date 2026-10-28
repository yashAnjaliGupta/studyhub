from typing import List, Dict

OFFICIAL_SYLLABUS_TOPICS: Dict[str, List[str]] = {
    "Physics": [
        "Units and Measurements",
        "Mathematical Tools and Vectors",
        "Motion in a Straight Line",
        "Motion in a Plane",
        "Laws of Motion",
        "Work, Energy and Power",
        "System of Particles and Centre of Mass",
        "Rotational Motion",
        "Gravitation",
        "Mechanical Properties of Solids",
        "Mechanical Properties of Fluids",
        "Thermal Properties of Matter",
        "Thermodynamics",
        "Kinetic Theory of Gases",
        "Oscillations",
        "Waves",
        "Electric Charges and Fields",
        "Electrostatic Potential and Capacitance",
        "Current Electricity",
        "Moving Charges and Magnetism",
        "Magnetism and Matter",
        "Electromagnetic Induction",
        "Alternating Current",
        "Electromagnetic Waves",
        "Ray Optics and Optical Instruments",
        "Wave Optics",
        "Dual Nature of Radiation and Matter",
        "Atoms",
        "Nuclei",
        "Semiconductor Electronics",
        "Experimental Skills"
    ],
    "Chemistry": [
        "Some Basic Concepts of Chemistry",
        "Atomic Structure",
        "Chemical Bonding and Molecular Structure",
        "Classification of Elements and Periodicity in Properties",
        "Chemical Thermodynamics",
        "Solutions",
        "Equilibrium",
        "Redox Reactions",
        "Electrochemistry",
        "Chemical Kinetics",
        "p-Block Elements",
        "d- and f-Block Elements",
        "Coordination Compounds",
        "Purification and Characterisation of Organic Compounds",
        "Some Basic Principles of Organic Chemistry",
        "Hydrocarbons",
        "Organic Compounds Containing Halogens",
        "Organic Compounds Containing Oxygen",
        "Organic Compounds Containing Nitrogen",
        "Biomolecules",
        "Principles Related to Practical Chemistry"
    ],
    "Mathematics": [
        "Sets",
        "Relations and Functions",
        "Trigonometric Functions, Identities and Equations",
        "Complex Numbers and Quadratic Equations",
        "Permutations and Combinations",
        "Binomial Theorem",
        "Sequences and Series",
        "Straight Lines",
        "Circles",
        "Conic Sections",
        "Limits, Continuity and Differentiability",
        "Differentiation",
        "Applications of Derivatives",
        "Indefinite Integration",
        "Definite Integration",
        "Area Under Curves",
        "Differential Equations",
        "Matrices",
        "Determinants",
        "Vector Algebra",
        "Three-Dimensional Geometry",
        "Probability",
        "Statistics"
    ],
    "Biology": [
        "The Living World",
        "Biological Classification",
        "Plant Kingdom",
        "Animal Kingdom",
        "Morphology of Flowering Plants",
        "Anatomy of Flowering Plants",
        "Structural Organisation in Animals",
        "Cell: The Unit of Life",
        "Cell Cycle and Cell Division",
        "Photosynthesis in Higher Plants",
        "Respiration in Plants",
        "Plant Growth and Development",
        "Breathing and Exchange of Gases",
        "Body Fluids and Circulation",
        "Excretory Products and Their Elimination",
        "Locomotion and Movement",
        "Neural Control and Coordination",
        "Chemical Coordination and Integration",
        "Sexual Reproduction in Flowering Plants",
        "Human Reproduction",
        "Reproductive Health",
        "Principles of Inheritance and Variation",
        "Molecular Basis of Inheritance",
        "Evolution",
        "Human Health and Disease",
        "Microbes in Human Welfare",
        "Biotechnology: Principles and Processes",
        "Biotechnology and Its Applications",
        "Organisms and Populations",
        "Ecosystem",
        "Biodiversity and Conservation",
        "Anatomy",
        "Physiology",
        "Biochemistry",
        "Pathology",
        "Pharmacology",
        "Microbiology",
        "Forensic Medicine and Toxicology",
        "Community Medicine / Preventive and Social Medicine",
        "General Medicine",
        "General Surgery",
        "Obstetrics and Gynaecology",
        "Paediatrics",
        "Ophthalmology",
        "Otorhinolaryngology (ENT)",
        "Orthopaedics",
        "Dermatology",
        "Psychiatry",
        "Anaesthesiology",
        "Radiodiagnosis"
    ]
}

def get_topics_for_subject(subject: str) -> List[str]:
    s = (subject or "").strip().lower()
    if "phys" in s:
        return OFFICIAL_SYLLABUS_TOPICS["Physics"]
    if "chem" in s:
        return OFFICIAL_SYLLABUS_TOPICS["Chemistry"]
    if "math" in s:
        return OFFICIAL_SYLLABUS_TOPICS["Mathematics"]
    if "bio" in s or "botany" in s or "zoology" in s or "neet" in s or "medical" in s:
        return OFFICIAL_SYLLABUS_TOPICS["Biology"]
    # Fallback to all combined if subject is generic
    combined: List[str] = []
    for topic_list in OFFICIAL_SYLLABUS_TOPICS.values():
        combined.extend(topic_list)
    return combined

def normalize_topic_for_subject(raw_topic: str, subject: str) -> str:
    """
    Normalizes an LLM-suggested topic against the official syllabus chapters for the given subject.
    Strips leading chapter numbers (e.g. '8. Rotational Motion' -> 'Rotational Motion'),
    handles case-insensitive and partial containment matching.
    """
    if not raw_topic or not raw_topic.strip():
        topics = get_topics_for_subject(subject)
        return topics[0] if topics else "General Concepts"

    clean = raw_topic.strip().strip('"\'')
    # Remove leading numbering like "8.", "8)", "Q8:", "Chapter 8:"
    import re
    clean = re.sub(r'^(?:chapter\s+)?\d+[\.:\)\s-]+\s*', '', clean, flags=re.IGNORECASE).strip()

    valid_topics = get_topics_for_subject(subject)
    valid_lower_map = {t.lower(): t for t in valid_topics}

    # 1. Exact match (case-insensitive)
    if clean.lower() in valid_lower_map:
        return valid_lower_map[clean.lower()]

    # 2. Substring match (e.g., "Rotational Motion and Dynamics" matches "Rotational Motion")
    clean_low = clean.lower()
    for t in valid_topics:
        t_low = t.lower()
        if t_low in clean_low or clean_low in t_low:
            return t

    # 3. Word overlap match
    clean_words = set(re.findall(r'\w+', clean_low)) - {"and", "of", "in", "the", "to", "for", "a", "an"}
    best_match = None
    best_overlap = 0
    for t in valid_topics:
        t_words = set(re.findall(r'\w+', t.lower())) - {"and", "of", "in", "the", "to", "for", "a", "an"}
        overlap = len(clean_words.intersection(t_words))
        if overlap > best_overlap:
            best_overlap = overlap
            best_match = t

    if best_match and best_overlap > 0:
        return best_match

    # Default fallback
    return clean if clean else "General Concepts"

