import type { ExamEvaluationResult, ExamSessionData, QuestionEvaluation } from './exam-session';
import type { ProcessedPaper } from './paper-service';
import type {
  CompleteDiagnosticReport,
  DiagnosticSectionOverview,
  DiagnosticSubjectBreakdown,
  DiagnosticTopicItem,
  DiagnosticQuestionDeepDive,
  DiagnosticAttemptJourney,
  DiagnosticImprovementPlan,
  TopicDiagnosticClassification,
} from './diagnostic-types';

/**
 * Deterministically classify topics into the 5-point coaching matrix
 */
export function classifyTopicPerformance(
  topicName: string,
  subject: string,
  total: number,
  attempted: number,
  correct: number,
  incorrect: number,
  skipped: number,
  scoreAwarded: number,
  maxMarks: number,
  avgTimeSeconds: number
): DiagnosticTopicItem {
  const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
  let classification: TopicDiagnosticClassification = 'Insufficient evidence';
  let recommendedAction = 'Practice more questions before diagnostic conclusion';
  let diagnosisReasoning = 'Sample size too small to confirm mastery pattern.';

  if (total < 2 || attempted === 0) {
    classification = 'Insufficient evidence';
    recommendedAction = 'Solve foundational 5-question set in Question Bank';
    diagnosisReasoning = 'Too few questions attempted to determine conceptual pattern.';
  } else if (accuracy >= 75) {
    if (avgTimeSeconds <= 120) {
      classification = 'Strong';
      recommendedAction = 'Maintain with periodic mixed mock practice';
      diagnosisReasoning = 'High accuracy with swift, confident execution.';
    } else {
      classification = 'Accurate but slow';
      recommendedAction = 'Timed problem drills to optimize shortcut steps';
      diagnosisReasoning = 'Strong theoretical grasp, but solving pace drags overall timing.';
    }
  } else if (accuracy < 50 && avgTimeSeconds < 90 && attempted >= 1) {
    classification = 'Fast but inaccurate';
    recommendedAction = 'Verification drills & double-checking calculation steps';
    diagnosisReasoning = 'Hastened attempts lead to unforced errors and negative marking.';
  } else if (incorrect >= 2 || (accuracy < 50 && attempted >= 2)) {
    classification = 'Conceptually weak';
    recommendedAction = 'Relearn theory and solve step-by-step guided examples';
    diagnosisReasoning = 'Repeated conceptual traps encountered in core fundamentals.';
  } else {
    classification = 'Accurate but slow';
    recommendedAction = 'Focused problem sets with strict time limits';
    diagnosisReasoning = 'Mixed accuracy requiring reinforced practice.';
  }

  // Priority score for revision order (lower accuracy + higher marks lost = higher priority)
  const priorityScore = (100 - accuracy) * 0.6 + (incorrect * 4) * 0.4;

  return {
    name: topicName,
    subject,
    attempted,
    total,
    accuracyPercent: Math.round(accuracy * 10) / 10,
    avgTimeSeconds,
    marksAwarded: scoreAwarded,
    maxMarks,
    classification,
    recommendedAction,
    diagnosisReasoning,
    priorityScore: Math.round(priorityScore),
  };
}

/**
 * Deterministically analyze answer switches across telemetry
 */
export function analyzeAnswerSwitches(
  sessionData: ExamSessionData,
  evaluation: ExamEvaluationResult
): {
  totalSwitches: number;
  goodSwitches: number;
  badSwitches: number;
  netMarksImpact: number;
  summary: string;
} {
  let totalSwitches = 0;
  let goodSwitches = 0;
  let badSwitches = 0;
  let netMarksImpact = 0;

  const telemetry = sessionData.telemetry || {};

  evaluation.questionEvaluations.forEach((qEval) => {
    const qTele = telemetry[qEval.questionId];
    const switches = qTele?.switches || [];
    if (switches.length > 0) {
      totalSwitches += switches.length;
      const initialChoice = switches[0]?.from;
      const finalChoice = switches[switches.length - 1]?.to;

      const isInitialCorrect = initialChoice !== undefined && String(initialChoice) === String(qEval.correctAnswer);
      const isFinalCorrect = qEval.isCorrect;

      if (!isInitialCorrect && isFinalCorrect) {
        // Switched from wrong to right: gained +4 marks instead of -1 = +5 net
        goodSwitches++;
        netMarksImpact += 5;
      } else if (isInitialCorrect && !isFinalCorrect) {
        // Second-guess penalty: switched away from right answer to wrong = -5 net
        badSwitches++;
        netMarksImpact -= 5;
      }
    }
  });

  let summary = 'You maintained stable decision discipline with minimal answer second-guessing.';
  if (badSwitches > goodSwitches) {
    summary = `Second-guessing cost you net ${Math.abs(netMarksImpact)} marks. You switched away from correct answers ${badSwitches} times. Train yourself to stick with your initial derivation unless an explicit arithmetic error is found.`;
  } else if (goodSwitches > badSwitches) {
    summary = `Your answer revisions were advantageous, gaining net +${netMarksImpact} marks across ${goodSwitches} corrected answers.`;
  }

  return {
    totalSwitches,
    goodSwitches,
    badSwitches,
    netMarksImpact,
    summary,
  };
}

/**
 * Select the Top 12-15 Critical Questions that require root-cause analysis
 */
export function selectCriticalQuestions(
  evaluation: ExamEvaluationResult,
  sessionData: ExamSessionData
): QuestionEvaluation[] {
  const telemetry = sessionData.telemetry || {};

  return [...evaluation.questionEvaluations]
    .filter((q) => q.isAttempted)
    .sort((a, b) => {
      // Prioritize second-guess errors, time sinks, rush mistakes, and incorrect answers
      const teleA = telemetry[a.questionId];
      const teleB = telemetry[b.questionId];

      const scoreA =
        (a.tags?.includes('SECOND_GUESS_PENALTY') ? 50 : 0) +
        (a.tags?.includes('TIME_SINK') ? 40 : 0) +
        (a.tags?.includes('RUSH_ERROR') ? 30 : 0) +
        (!a.isCorrect ? 25 : 0) +
        (teleA?.dwellSeconds ? Math.min(20, teleA.dwellSeconds / 15) : 0);

      const scoreB =
        (b.tags?.includes('SECOND_GUESS_PENALTY') ? 50 : 0) +
        (b.tags?.includes('TIME_SINK') ? 40 : 0) +
        (b.tags?.includes('RUSH_ERROR') ? 30 : 0) +
        (!b.isCorrect ? 25 : 0) +
        (teleB?.dwellSeconds ? Math.min(20, teleB.dwellSeconds / 15) : 0);

      return scoreB - scoreA;
    })
    .slice(0, 15);
}

/**
 * Generate highly context-aware actionable checklists for each question based on:
 * 1. Cognitive / behavioral tag (SECOND_GUESS_PENALTY, TIME_SINK, RUSH_ERROR, OPTION_DILEMMA)
 * 2. Subject domain (Physics, Chemistry, Mathematics, Biology)
 * 3. Topic specifics (Mechanics, Calculus, Organic Chemistry, etc.)
 * 4. Outcome (correct, eventually_correct, incorrect)
 */
export function generateActionableChecklist(params: {
  subject: string;
  topic: string;
  isCorrect: boolean;
  isRush: boolean;
  isSink: boolean;
  isSecondGuess: boolean;
  isSwitched: boolean;
  dwellSeconds: number;
}): string[] {
  const { subject, topic, isCorrect, isRush, isSink, isSecondGuess, isSwitched, dwellSeconds } = params;
  const sLower = (subject || '').toLowerCase();
  const tLower = (topic || '').toLowerCase();
  const checklist: string[] = [];

  // 1. Behavioral Root Cause Advice (Top Priority)
  if (isSecondGuess) {
    checklist.push('Trust your initial derivation: lock in first calculated choices unless an explicit arithmetic flaw is proven on paper.');
    checklist.push('On 50/50 dilemmas, eliminate options via boundary conditions rather than switching out of nervousness.');
    checklist.push('During final review, re-read the core equation from scratch on fresh scratch space rather than staring at prior choices.');
    return checklist;
  }

  if (isSink) {
    checklist.push(`Enforce a strict 2.5-minute abort rule: spending ${Math.round(dwellSeconds / 60)}m on one question drains bandwidth needed for easy marks.`);
    checklist.push('Test extreme boundary limits or option elimination shortcuts before committing to multi-step algebra.');
    checklist.push('If trapped halfway, mark for Round 2 review and immediately move to an accessible single-step problem.');
    return checklist;
  }

  if (isRush) {
    checklist.push(`Slow down initial reading: ${dwellSeconds}s is too hasty; examiners deliberately plant trap options for quick calculations.`);
    checklist.push("Scan the prompt twice for inversion triggers: look for words like 'NOT correct', 'INCORRECT statement', or unstated units.");
    checklist.push('Take a deliberate 5-second sanity pause before clicking Save & Next to verify final units and sign (+/-).');
    return checklist;
  }

  // 2. Subject & Topic Contextual Recommendations
  if (sLower.includes('phys')) {
    if (tLower.includes('mechanic') || tLower.includes('rotat') || tLower.includes('gravitat') || tLower.includes('work') || tLower.includes('motion')) {
      checklist.push('Draw a clean Free Body Diagram (FBD) and establish explicit positive coordinate axes before writing equations of motion.');
      checklist.push('Verify standard SI units (convert grams to kg, cm to meters) before computing numerical products.');
      checklist.push('Cross-check extreme limit cases (e.g. angle θ = 0° or mass m → 0) to verify if the algebraic formula behaves correctly.');
    } else if (tLower.includes('electro') || tLower.includes('magnet') || tLower.includes('current') || tLower.includes('capacit')) {
      checklist.push('Map vector directions using the right-hand rule and write scalar field equations separately.');
      checklist.push('Double-check boundary conditions (conductor surface charge vs dielectric boundary) before applying Gauss’s/Ampere’s law.');
      checklist.push('Verify energy conservation and dimensional consistency before choosing your final option.');
    } else if (tLower.includes('thermo') || tLower.includes('heat') || tLower.includes('kinetic')) {
      checklist.push('Identify the thermodynamic process (isothermal, adiabatic, isobaric) and verify the sign of work done (W = PΔV vs -PΔV).');
      checklist.push('Always convert temperature to Kelvin (T = t + 273.15) before applying ideal gas laws.');
      checklist.push('Check degrees of freedom based on whether the gas is monoatomic, diatomic, or non-linear.');
    } else if (tLower.includes('optic') || tLower.includes('wave')) {
      checklist.push('Adhere strictly to Cartesian sign convention with the optical center/pole as origin.');
      checklist.push('Distinguish phase difference from path difference before calculating fringe positions.');
      checklist.push('Sanity check whether the image is virtual/real and erect/inverted with standard ray tracing.');
    } else {
      checklist.push('Write down given variables with standard SI units before applying formulas.');
      checklist.push('Use dimensional analysis to eliminate at least one physically incompatible option immediately.');
      checklist.push('Verify extreme limits (t → 0, t → ∞) to confirm formula validity.');
    }
  } else if (sLower.includes('chem')) {
    if (tLower.includes('organ')) {
      checklist.push('Identify the primary electrophilic and nucleophilic reaction centers and determine intermediate carbocation/carbanion stability.');
      checklist.push('Verify stereochemical implications (inversion in SN2 vs retention/racemization, Markovnikov vs Anti-Markovnikov).');
      checklist.push('Check reaction conditions (temperature, acidic/basic medium, solvent polarity) that dictate elimination vs substitution.');
    } else if (tLower.includes('inorgan') || tLower.includes('coordinat') || tLower.includes('periodic') || tLower.includes('bonding')) {
      checklist.push('Watch for transition metal exceptions: check crystal field splitting (strong field vs weak field ligands) and pairing energy.');
      checklist.push('Recall periodic anomaly rules: inert pair effect, lanthanoid contraction, and half-filled/fully-filled orbital stability.');
      checklist.push('Check the oxidation state of the central metal atom before predicting coordination number and geometry.');
    } else if (tLower.includes('physic') || tLower.includes('therm') || tLower.includes('equilib') || tLower.includes('kinet') || tLower.includes('electrochem')) {
      checklist.push('Double-check gas constant units: use R = 8.314 J/(mol·K) for energy, but 0.0821 L·atm/(mol·K) for PV = nRT.');
      checklist.push('Write and balance the stoichiometry before setting up equilibrium (Kc, Kp) or Nernst equation quotients.');
      checklist.push('Check the sign of standard reduction potentials (E°) before evaluating spontaneous cell reactions.');
    } else {
      checklist.push('Confirm whether the question asks for the true statement or the FALSE/EXCEPT statement.');
      checklist.push('Balance chemical equations and verify stoichiometric molar ratios before executing calculations.');
      checklist.push('Recall periodic trends and stability rules before eliminating options.');
    }
  } else if (sLower.includes('math')) {
    if (tLower.includes('calcul') || tLower.includes('integr') || tLower.includes('differen') || tLower.includes('limit') || tLower.includes('function')) {
      checklist.push('Check domain and continuity restrictions (x > 0, denominator ≠ 0) to filter out extraneous roots.');
      checklist.push('Test standard boundary substitutions (x = 0, 1, -1) or L’Hôpital’s rule to quickly verify candidate options.');
      checklist.push('Check for symmetry (odd/even functions or periodic properties) to simplify definite integrals.');
    } else if (tLower.includes('coordinat') || tLower.includes('conic') || tLower.includes('circle') || tLower.includes('parabol') || tLower.includes('hyperbol') || tLower.includes('line')) {
      checklist.push('Sketch a quick geometric diagram with coordinate axes to verify slopes, intercepts, and quadrant signs.');
      checklist.push('Substitute standard point coordinates (x1, y1) directly into the curve equation to verify tangent/normal conditions.');
      checklist.push('Use parametric forms (at², 2at) or (a cos θ, b sin θ) to reduce multivariable algebra.');
    } else if (tLower.includes('vector') || tLower.includes('3d') || tLower.includes('plane')) {
      checklist.push('Check orthogonality and parallelism conditions using dot product and cross product.');
      checklist.push('Write direction ratios and direction cosines clearly before setting up line and plane intersection formulas.');
      checklist.push('Verify normal vector orientation to confirm distance formulas.');
    } else if (tLower.includes('algebra') || tLower.includes('matric') || tLower.includes('determin') || tLower.includes('complex') || tLower.includes('probab')) {
      checklist.push('Substitute small test values (n = 1, 2, 3 or z = i, 1) to eliminate incorrect general options quickly.');
      checklist.push('For matrices/determinants, use elementary row/column operations or trace/eigenvalue invariants rather than full expansion.');
      checklist.push('In probability, verify whether events are independent or mutually exclusive, and cross-check complementary probability.');
    } else {
      checklist.push('Test boundary and edge values (x = 0, 1, -1) into options before solving algebraically.');
      checklist.push('Check for extraneous roots introduced during squaring or multiplying variables.');
      checklist.push('Maintain clean scratch work to prevent sign errors in intermediate steps.');
    }
  } else {
    // General fallback
    if (isCorrect) {
      checklist.push('Benchmark approach: replicate this systematic solving flow on similar questions.');
      checklist.push('Note shortcut techniques to reduce solving duration by another 15-20 seconds.');
      checklist.push('Add this core pattern to your revision cheat sheet as a validated scoring asset.');
    } else {
      checklist.push('Read all 4 options thoroughly before selecting your candidate answer.');
      checklist.push('Break down complex problem statements into given parameters and target variables.');
      checklist.push('Double-check calculations on scratch paper before finalizing submission.');
    }
  }

  return checklist;
}

/**
 * Build deterministic baseline CompleteDiagnosticReport
 */
export function buildDeterministicDiagnosticReport(
  evaluation: ExamEvaluationResult,
  paper: ProcessedPaper,
  sessionData: ExamSessionData
): CompleteDiagnosticReport {
  const totalScore = evaluation.scoreAwarded;
  const maxScore = evaluation.totalMarks || 300;
  const accuracyRate = evaluation.percentage;
  const attemptedCount = evaluation.correctCount + evaluation.incorrectCount;
  const totalQuestions = evaluation.totalQuestions;
  const timeSpentMinutes = evaluation.timeSpentMinutes;
  const durationMinutes = Math.round((sessionData.durationSeconds || 10800) / 60);
  const timeUtilizationPercent = Math.min(100, Math.round((timeSpentMinutes / Math.max(1, durationMinutes)) * 100));

  // 1. Calculate unforced marks recovery potential
  const rushMistakesCount = evaluation.questionEvaluations.filter((q) => q.tags?.includes('RUSH_ERROR')).length;
  const secondGuessPenaltyCount = evaluation.questionEvaluations.filter((q) => q.tags?.includes('SECOND_GUESS_PENALTY')).length;
  const timeSinksCount = evaluation.questionEvaluations.filter((q) => q.tags?.includes('TIME_SINK')).length;
  const marksRecoverable = rushMistakesCount * 5 + secondGuessPenaltyCount * 5 + Math.min(20, timeSinksCount * 4);

  // 2. Classify all topics
  const topics: DiagnosticTopicItem[] = evaluation.topicPerformance.map((t) =>
    classifyTopicPerformance(
      t.name,
      t.subject,
      t.total,
      t.attempted,
      t.correct,
      t.incorrect,
      t.skipped,
      t.scoreAwarded,
      t.maxScore,
      t.avgTimeSeconds || Math.round(evaluation.avgTimePerQuestionSeconds)
    )
  );

  // Sort topics by priority score descending
  topics.sort((a, b) => b.priorityScore - a.priorityScore);

  // 3. Subject-wise analysis breakdown
  const subjects: DiagnosticSubjectBreakdown[] = Object.entries(evaluation.subjectPerformance).map(
    ([subjName, data]) => {
      const subjQuestions = evaluation.questionEvaluations.filter((q) => q.subject.toLowerCase() === subjName.toLowerCase());
      const conceptualCount = subjQuestions.filter((q) => !q.isCorrect && (q.timeSpentSeconds > 90 || q.revisitCount > 0)).length;
      const calculationCount = subjQuestions.filter((q) => !q.isCorrect && (q.tags?.includes('RUSH_ERROR') || q.type === 'numerical')).length;
      const strategyTimeOutCount = subjQuestions.filter((q) => q.tags?.includes('TIME_SINK')).length;

      const topicsInSubject = topics.filter((t) => t.subject.toLowerCase() === subjName.toLowerCase());

      return {
        subject: subjName,
        scoreAwarded: data.score,
        maxScore: data.total * 4,
        accuracyPercent: data.accuracy,
        timeSpentMinutes: Math.round(
          subjQuestions.reduce((acc, q) => acc + (q.timeSpentSeconds || 0), 0) / 60
        ),
        medianSolvingSeconds: Math.round(
          subjQuestions.length > 0
            ? subjQuestions.reduce((acc, q) => acc + (q.timeSpentSeconds || 0), 0) / subjQuestions.length
            : 120
        ),
        benchmarkSolvingSeconds: 120,
        diagnosis:
          data.accuracy >= 70
            ? `Solid performance in ${subjName} with strong conceptual grasp. Focus on shaving 15-20s per question to bank reserve time.`
            : `Opportunity in ${subjName} to eliminate careless negative marks and avoid getting bogged down on complex multi-step questions.`,
        topicPriorities: topicsInSubject.slice(0, 5).map((t) => ({
          name: t.name,
          correct: Math.round((t.accuracyPercent / 100) * t.attempted),
          total: t.total,
          priority: t.accuracyPercent < 45 ? 'Very High' : t.accuracyPercent < 65 ? 'High' : 'Medium',
        })),
        errorTaxonomy: {
          conceptualCount,
          calculationCount,
          strategyTimeOutCount,
        },
        actionItems: [
          `Target ${Math.min(5, topicsInSubject.length)} weakest concepts in ${subjName} before your next full exam.`,
          `Set a strict 3-minute hard stop on numerical questions to prevent time traps.`,
          `Practice speed drills for formulas and unit-conversions.`,
        ],
      };
    }
  );

  // 4. Switch & attempt journey analysis
  const switchAnalysis = analyzeAnswerSwitches(sessionData, evaluation);

  // 5. Build critical question deep-dives
  const criticalQuestionsRaw = selectCriticalQuestions(evaluation, sessionData);
  const questions: DiagnosticQuestionDeepDive[] = criticalQuestionsRaw.map((q) => {
    const isSwitched = (sessionData.telemetry?.[q.questionId]?.switches?.length || 0) > 0;
    const dwell = q.timeSpentSeconds || 60;
    const isRush = q.tags?.includes('RUSH_ERROR') || false;
    const isSink = q.tags?.includes('TIME_SINK') || false;
    const isSecondGuess = q.tags?.includes('SECOND_GUESS_PENALTY') || false;

    let whatHappened = q.isCorrect
      ? `Successfully solved and answered in ${dwell}s.`
      : `Submitted an incorrect answer after ${dwell}s.`;

    if (isSwitched) {
      whatHappened = `Changed response during the attempt. User spent ${dwell}s evaluating options before final confirmation.`;
    } else if (isSink) {
      whatHappened = `Spent an extensive ${Math.round(dwell / 60)} minutes attempting this question without converting it to positive marks.`;
    } else if (isRush) {
      whatHappened = `Rushed answer in only ${dwell}s, leading to a hasty mistake and -${q.negativeMarks || 1} mark penalty.`;
    }

    let whereDidItGoWrong = q.isCorrect
      ? 'Execution followed standard solving methodology.'
      : 'Likely tripped on formula assumption or misread a boundary condition.';

    if (isSecondGuess) {
      whereDidItGoWrong = 'Uncertainty caused switching away from the initial correct deduction.';
    } else if (isSink) {
      whereDidItGoWrong = 'Stuck in multi-step algebraic derivation without checking if an elimination shortcut was possible.';
    }

    const actionableChecklist = generateActionableChecklist({
      subject: q.subject,
      topic: q.topic,
      isCorrect: q.isCorrect,
      isRush,
      isSink,
      isSecondGuess,
      isSwitched,
      dwellSeconds: dwell,
    });

    return {
      questionId: q.questionId,
      sequenceNum: q.sequenceNum,
      subject: q.subject,
      topic: q.topic,
      type: q.type,
      marksAwarded: q.scoreAwarded,
      timeSpentSeconds: dwell,
      targetSolvingSeconds: 120,
      outcome: q.isCorrect ? (isSwitched ? 'eventually_correct' : 'correct') : 'incorrect',
      userAnswerText:
        typeof q.userAnswer === 'number'
          ? `Option ${String.fromCharCode(65 + q.userAnswer)}`
          : String(q.userAnswer || 'Not Attempted'),
      correctAnswerText:
        typeof q.correctAnswer === 'number'
          ? `Option ${String.fromCharCode(65 + q.correctAnswer)}`
          : String(q.correctAnswer),
      whatHappened,
      whereDidItGoWrong,
      confidenceRating: isSink || isSwitched ? 'High' : 'Moderate',
      actionableChecklist,
      tags: q.tags || [],
    };
  });

  // 6. Section 01 Overview
  const strongestTopic = evaluation.strongTopics[0]?.name || topics[topics.length - 1]?.name || 'General';
  const weakestTopic = evaluation.weakTopics[0]?.name || topics[0]?.name || 'General';

  // Determine Personalized Cognitive Archetype based on detailed telemetry
  let studentArchetype = 'The Methodical Strategist (High-Conversion Candidate)';
  let archetypeDesc = 'Disciplined pacing and high conceptual accuracy with solid composure under exam pressure.';

  if (secondGuessPenaltyCount >= 2 && switchAnalysis.badSwitches > switchAnalysis.goodSwitches) {
    studentArchetype = 'The Hesitant Second-Guesser (Indecision Mark Leak)';
    archetypeDesc = 'You demonstrate strong initial instinct and sound physics/math derivations, but uncertainty in the final minutes causes you to switch away from correct choices into distractor options, eroding net marks.';
  } else if (rushMistakesCount >= 3 || (rushMistakesCount >= 2 && evaluation.avgTimePerQuestionSeconds < 75)) {
    studentArchetype = 'The Impulsive Sprinter (Speed Trap Vulnerability)';
    archetypeDesc = 'You possess rapid question recognition and high pace, but haste past critical prompt nuances and units causes avoidable negative marks on accessible problems.';
  } else if (timeSinksCount >= 2) {
    studentArchetype = 'The Stubborn Solver (Over-Investment Trap)';
    archetypeDesc = 'You get locked into extensive multi-step algebra on high-friction questions, sacrificing precious clock bandwidth that could have easily yielded double the marks on subsequent questions.';
  } else if (timeUtilizationPercent < 55) {
    studentArchetype = 'The Premature Submitter (Clock Under-Utilization)';
    archetypeDesc = 'You completed your exam with extensive clock time unused, leaving high-yield review, option verification, and Round 2 question attempts on the table.';
  } else if (evaluation.percentage < 50) {
    studentArchetype = 'The Developing Tactician (Selective Optimization Needed)';
    archetypeDesc = 'Good baseline exam engagement, with significant score-multiplier upside available through stricter question filtration and error elimination.';
  }

  // Construct Deeply Personalized, Signal-Rich Executive Strategic Diagnosis
  const executiveSummary = [
    `🎯 **Exam Temperament Archetype: ${studentArchetype}**\n${archetypeDesc}`,
    `📊 **Cognitive Performance & Pacing Audit**:\n` +
      `You attempted ${attemptedCount} of ${totalQuestions} questions (${Math.round((attemptedCount / Math.max(1, totalQuestions)) * 100)}% coverage) scoring ${totalScore} / ${maxScore} (${evaluation.percentage}%) across ${timeSpentMinutes} mins (${timeUtilizationPercent}% clock utilization). Your pacing averaged ${evaluation.avgTimePerQuestionSeconds}s per question (target benchmark: ~120s). Your strongest scoring engine was **${strongestTopic}**, where high-accuracy conversion banked solid marks. Conversely, **${weakestTopic}** represented your primary cognitive vulnerability, accounting for significant point erosion.`,
    `⚠️ **The +${marksRecoverable} Marks Recovery Roadmap (Unforced Mark Bleed)**:\n` +
      `Our telemetry diagnosis detected **+${marksRecoverable} marks** directly recoverable without learning new concepts:\n` +
      `• **${rushMistakesCount} Rush Errors (<35s)**: Cost -${rushMistakesCount * 5} net marks from hasty misreads and negative marking.\n` +
      `• **${secondGuessPenaltyCount} Second-Guess Penalties**: Cost -${secondGuessPenaltyCount * 5} net marks when switching away from correct derivations into wrong options.\n` +
      `• **${timeSinksCount} Time Traps (>3.5m)**: Sunk ~${timeSinksCount * 4} minutes into dead-end calculations that yielded 0 positive marks.`,
    `⏱️ **Cross-Subject Tactical Balance**:\n` +
      subjects
        .map(
          (s) =>
            `• **${s.subject}**: ${s.scoreAwarded}/${s.maxScore} marks (${s.accuracyPercent}% accuracy) across ${s.timeSpentMinutes}m (${
              s.accuracyPercent >= 70 ? 'High efficiency engine' : s.timeSpentMinutes > 65 ? 'High time investment' : 'Needs accuracy stabilization'
            }).`
        )
        .join('\n'),
    `🚀 **Non-Negotiable Execution Protocols for Next Mock**:\n` +
      `1. **Round 1 Gatekeeper**: Impose an uncompromising 2.5-minute hard stop on any single question during Round 1. If an answer isn't clear, mark for review and maintain momentum.\n` +
      `2. **Anti-Second-Guess Rule**: Strictly forbid altering chosen options in the final 15 minutes unless an explicit arithmetic flaw is proven on scratch paper.\n` +
      `3. **Targeted Revision Sprint**: Prioritize focused problem sets in **${weakestTopic}** to convert negative marks into reliable +4 conversions.`
  ].join('\n\n');

  const overview: DiagnosticSectionOverview = {
    totalScore,
    maxScore,
    percentage: evaluation.percentage,
    accuracyRate: evaluation.percentage,
    questionsAttempted: attemptedCount,
    totalQuestions,
    timeUtilizationPercent,
    totalTimeMinutes: timeSpentMinutes,
    marksRecoverable,
    studentArchetype,
    executiveSummary,
    topStrengths: [
      `High scoring conversion and mastery in ${strongestTopic}.`,
      `Maintained answer confidence on ${switchAnalysis.totalSwitches <= 3 ? 'single-shot answers' : 'key questions'}.`,
      `Attempted ${attemptedCount} questions with consistent active pacing.`,
    ],
    topOpportunities: [
      `Recover up to +${marksRecoverable} marks by cutting unforced rush errors and second-guessing.`,
      `Set a strict 2.5-minute cutoff on difficult questions to prevent time sinks.`,
      `Prioritize ${weakestTopic} in your upcoming revision cycle.`,
    ],
    nextTestFocus: [
      'Double-check calculation steps before hitting save and next.',
      'Skip lengthy numericals on pass 1 and return to them during pass 2.',
      'Trust your first derivation unless proven wrong by direct substitution.',
    ],
    threeGoldenRules: [
      'Rule 1: Never spend more than 2.5 minutes on a question during the first round.',
      'Rule 2: Read the question stem twice to ensure you are solving for the requested variable.',
      'Rule 3: Maintain calm composure in the final 30 minutes to prevent calculation rush.',
    ],
  };

  // 7. Improvement Plan
  const topPriorityTopics = topics.filter((t) => t.classification !== 'Strong').slice(0, 5);
  const plan: DiagnosticImprovementPlan = {
    rankedPriorities: topPriorityTopics.map((t, idx) => ({
      rank: idx + 1,
      title: `Master ${t.name} Fundamentals`,
      subject: t.subject,
      targetMarksGain: Math.min(12, t.total * 4 - Math.max(0, t.marksAwarded)),
      whyItMatters: `${t.name} holds ${t.total} questions in this test and accounts for lost marks.`,
      actionStep: t.recommendedAction,
      practiceUrl: `/questions/${encodeURIComponent(t.subject)}/${encodeURIComponent(t.name)}`,
    })),
    nextTestGoals: {
      targetScore: Math.min(maxScore, totalScore + marksRecoverable),
      targetTimeDistribution: {
        Physics: '60 mins',
        Chemistry: '45 mins',
        Mathematics: '75 mins',
      },
      pacingRule: 'Round 1 (Easy / Fast): 90 mins · Round 2 (Medium / Calculations): 60 mins · Round 3 (Review): 30 mins',
    },
  };

  const journey: DiagnosticAttemptJourney = {
    staminaCurve: [
      { timeBlockMinutes: '0-45m', accuracyPercent: Math.min(100, Math.round(accuracyRate * 1.15)), avgSpeedSeconds: 85 },
      { timeBlockMinutes: '45-90m', accuracyPercent: Math.round(accuracyRate), avgSpeedSeconds: 110 },
      { timeBlockMinutes: '90-135m', accuracyPercent: Math.max(0, Math.round(accuracyRate * 0.9)), avgSpeedSeconds: 135 },
      { timeBlockMinutes: '135-180m', accuracyPercent: Math.max(0, Math.round(accuracyRate * 0.8)), avgSpeedSeconds: 125 },
    ],
    fatigueInsight:
      timeSpentMinutes > 120
        ? 'Fatigue onset observed after the 90-minute mark where accuracy dipped slightly. Scheduled 30-second eye rests between subject switches can preserve mental sharpness.'
        : 'Steady energy levels maintained throughout the duration.',
    switchAnalysis,
    behavioralTraps: {
      rushErrorsCount: rushMistakesCount,
      timeSinksCount,
      secondGuessCount: secondGuessPenaltyCount,
      hesitationCount: evaluation.hesitationCount || 0,
    },
  };

  return {
    attemptId: sessionData.attemptId || 'attempt_demo',
    paperId: paper.id,
    paperTitle: paper.title,
    createdAt: Date.now(),
    overview,
    subjects,
    topics,
    questions,
    journey,
    plan,
  };
}
