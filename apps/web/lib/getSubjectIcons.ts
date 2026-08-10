import {
  Atom,
  Binary,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  Calculator,
  Cpu,
  Dumbbell,
  Earth,
  FlaskConical,
  Globe,
  HeartPulse,
  Landmark,
  Languages,
  Leaf,
  Microscope,
  Monitor,
  Music4,
  NotebookPen,
  Palette,
  PencilRuler,
  Scale,
  ScrollText,
  Shield,
  Sigma,
  Sprout,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

const SUBJECT_ICONS: Record<string, LucideIcon> = {
  // ==========================
  // Mathematics
  // ==========================
  Mathematics: Sigma,
  Maths: Sigma,
  Math: Sigma,
  "Applied Mathematics": Calculator,
  Statistics: Calculator,

  // ==========================
  // Science
  // ==========================
  Science: Atom,
  Physics: Atom,
  Chemistry: FlaskConical,
  Biology: Microscope,
  Botany: Leaf,
  Zoology: HeartPulse,
  Biotechnology: Microscope,
  Microbiology: Microscope,
  EnvironmentalScience: Sprout,
  "Environmental Science": Sprout,

  // ==========================
  // Social Science
  // ==========================
  "Social Science": Globe,
  SST: Globe,
  History: Landmark,
  Geography: Earth,
  Civics: Scale,
  "Political Science": Scale,
  Economics: Calculator,
  Sociology: Users,
  Psychology: Brain,
  Philosophy: Brain,

  // ==========================
  // Commerce
  // ==========================
  Commerce: BriefcaseBusiness,
  Accountancy: Calculator,
  Accounting: Calculator,
  "Business Studies": BriefcaseBusiness,
  Entrepreneurship: BriefcaseBusiness,

  // ==========================
  // Computer
  // ==========================
  "Computer Science": Cpu,
  Computers: Cpu,
  Informatics: Monitor,
  "Informatics Practices": Binary,
  Programming: Binary,
  Coding: Binary,
  Robotics: Cpu,
  "Artificial Intelligence": Brain,
  AI: Brain,

  // ==========================
  // Languages
  // ==========================
  English: Languages,
  Hindi: Languages,
  Sanskrit: ScrollText,
  Urdu: Languages,
  Tamil: Languages,
  Telugu: Languages,
  Kannada: Languages,
  Malayalam: Languages,
  Marathi: Languages,
  Punjabi: Languages,
  Gujarati: Languages,
  Bengali: Languages,
  Assamese: Languages,
  Odia: Languages,
  French: Languages,
  German: Languages,
  Spanish: Languages,
  Japanese: Languages,
  Chinese: Languages,

  // ==========================
  // Arts
  // ==========================
  Drawing: Palette,
  Painting: Palette,
  "Fine Arts": Palette,
  Art: Palette,
  Craft: Palette,

  // ==========================
  // Music
  // ==========================
  Music: Music4,
  Dance: Music4,

  // ==========================
  // Sports
  // ==========================
  "Physical Education": Dumbbell,
  Sports: Trophy,
  Yoga: Dumbbell,
  NCC: Shield,

  // ==========================
  // Engineering
  // ==========================
  "Engineering Graphics": PencilRuler,
  Graphics: PencilRuler,
  Design: PencilRuler,

  // ==========================
  // General
  // ==========================
  GK: BookOpen,
  "General Knowledge": BookOpen,
  "General Science": Atom,
  "Moral Science": BookOpen,
  "Value Education": NotebookPen,
  EVS: Sprout,
};

export function GetSubjectIcon(subjectName:string){
    return SUBJECT_ICONS[subjectName] ?? BookOpen;
}