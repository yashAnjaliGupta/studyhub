'use client';

// Exam Core Hooks
// Provides access to exam domain functionality
import { useState } from 'react';

export function useExamCore(attemptId: string) {
  const attempt = useExamAttempt(attemptId);
  const questions = useExamQuestions(attemptId);
  const answers = useExamAnswers(attemptId);

  return {
    examAttempt: attempt,
    questions: questions.data,
    saveAnswer: answers.saveAnswer,
    submitExam: answers.submitExam
  };
}

// Individual hooks (simplified implementations)
function useExamAttempt(attemptId: string) {
  // In real implementation, this would fetch from database
  return {
    id: attemptId,
    studentId: 'student-123',
    paperId: 'paper-456',
    status: 'IN_PROGRESS',
    config: {
      shuffleQuestions: true,
      shuffleOptions: true,
      durationMinutes: 180,
      isTimedSimulation: true
    },
    startedAt: new Date(),
    submittedAt: undefined,
    evaluatedAt: undefined
  };
}

function useExamQuestions(attemptId: string) {
  // In real implementation, this would fetch questions for the attempt
  return {
    data: [
      {
        id: 'q1',
        text: 'What is the acceleration due to gravity on Earth?',
        options: [
          { id: 'a', text: '9.8 m/s²', isCorrect: true },
          { id: 'b', text: '8.9 m/s²', isCorrect: false },
          { id: 'c', text: '10.2 m/s²', isCorrect: false },
          { id: 'd', text: '9.1 m/s²', isCorrect: false }
        ]
      },
      {
        id: 'q2',
        text: 'Which of the following is a scalar quantity?',
        options: [
          { id: 'a', text: 'Velocity', isCorrect: false },
          { id: 'b', text: 'Force', isCorrect: false },
          { id: 'c', text: 'Speed', isCorrect: true },
          { id: 'd', text: 'Acceleration', isCorrect: false }
        ]
      }
    ],
    isLoading: false,
    error: null
  };
}

function useExamAnswers(attemptId: string) {
  // In real implementation, this would interact with the database
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const saveAnswer = async (questionId: string, optionId: string | null) => {
    if (optionId === null) {
      delete answers[questionId];
    } else {
      answers[questionId] = optionId;
    }
    setAnswers({ ...answers });
    // In real implementation, save to database
  };

  const submitExam = async () => {
    // In real implementation, submit to database and return results
    return {
      score: 240,
      correctCount: 60,
      incorrectCount: 20,
      unansweredCount: 10
    };
  };

  return {
    answers,
    saveAnswer,
    submitExam
  };
}
