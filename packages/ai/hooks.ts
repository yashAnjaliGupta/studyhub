// AI Hooks
// Provides access to AI services for exam functionality

import { ExamAIService } from './index';

export function useExamAIService() {
  // In real implementation, this might use React context or dependency injection
  return {
    examAIService: new ExamAIService()
  };
}