import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { getBedrockClient } from "./bedrock";

export * from "./bedrock";
export * from "./embeddings";

// Exam-specific AI configuration
export interface ExamAIConfig {
  modelId: string;
  maxTokens: number;
  temperature: number;
  topP: number;
}

// Exam-specific prompt templates
export enum ExamPromptType {
  QUESTION_EXPLANATION = "question_explanation",
  TOPIC_RECOMMENDATION = "topic_recommendation",
  STUDY_PLAN = "study_plan",
  PERFORMANCE_ANALYSIS = "performance_analysis",
}

// Exam AI response types
export interface ExamAIResponse {
  type: ExamPromptType;
  content: string;
  confidence: number; // 0-1
  sources?: string[]; // References to questions, topics, etc.
  metadata?: Record<string, unknown>;
}

// Default exam AI configuration
export const defaultExamAIConfig: ExamAIConfig = {
  modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
  maxTokens: 2000,
  temperature: 0.7,
  topP: 0.9,
};

// Helper to invoke Bedrock model for exam-specific tasks
export async function invokeExamModel(
  prompt: string,
  config: ExamAIConfig = defaultExamAIConfig
): Promise<string> {
  const client = getBedrockClient();

  const requestBody = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    top_p: config.topP,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  };

  const command = new InvokeModelCommand({
    modelId: config.modelId,
    body: JSON.stringify(requestBody),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  // Extract text from Claude response
  return responseBody.content[0].text;
}

// Exam-specific AI service functions
export class ExamAIService {
  private config: ExamAIConfig;

  constructor(config: ExamAIConfig = defaultExamAIConfig) {
    this.config = config;
  }

  // Generate explanation for a question based on student's attempt
  async generateQuestionExplanation(
    questionText: string,
    correctAnswer: string,
    studentAnswer: string | null,
    topic: string,
    studentExplanationAttempt: string | null = null
  ): Promise<ExamAIResponse> {
    const prompt = `
      You are an expert educator helping a student understand a question they attempted.

      Question: ${questionText}
      Correct Answer: ${correctAnswer}
      Student's Answer: ${studentAnswer || "Not answered"}
      Topic: ${topic}
      ${studentExplanationAttempt ? `Student's Explanation Attempt: ${studentExplanationAttempt}` : ""}

      Please provide:
      1. A clear explanation of why the correct answer is correct
      2. If the student answered incorrectly, explain why their answer is wrong
      3. Key concepts the student should review
      4. A similar practice problem for reinforcement

      Keep the explanation educational, encouraging, and focused on learning.
    `;

    const content = await this.invokeExamModel(prompt);

    return {
      type: ExamPromptType.QUESTION_EXPLANATION,
      content,
      confidence: 0.9,
      sources: [questionText, topic],
      metadata: {
        questionText,
        correctAnswer,
        studentAnswer,
        topic,
      },
    };
  }

  // Generate personalized study plan based on performance
  async generateStudyPlan(
    performanceData: {
      topicScores: Record<string, number>;
      timeSpentPerTopic: Record<string, number>;
      questionAttempts: number;
      correctAnswers: number;
      weakTopics: string[];
      strongTopics: string[];
    }
  ): Promise<ExamAIResponse> {
    const prompt = `
      You are an educational consultant creating a personalized study plan for a JEE/NEET student.

      Performance Data:
      - Topic Scores: ${JSON.stringify(performanceData.topicScores)}
      - Time Spent Per Topic: ${JSON.stringify(performanceData.timeSpentPerTopic)}
      - Total Question Attempts: ${performanceData.questionAttempts}
      - Correct Answers: ${performanceData.correctAnswers}
      - Weak Topics: ${performanceData.weakTopics.join(", ")}
      - Strong Topics: ${performanceData.strongTopics.join(", ")}

      Please create a comprehensive study plan that includes:
      1. Weekly schedule with topic focus areas
      2. Specific resources to review for weak topics
      3. Practice strategies for improving weak areas
      4. Time management tips based on their spending patterns
      5. Milestones and progress checkpoints

      The plan should be realistic, actionable, and tailored to their specific needs.
    `;

    const content = await this.invokeExamModel(prompt);

    return {
      type: ExamPromptType.STUDY_PLAN,
      content,
      confidence: 0.85,
      sources: Object.keys(performanceData.topicScores),
      metadata: performanceData,
    };
  }

  // Generate topic recommendations based on performance
  async recommendTopicsForReview(
    weakTopics: string[],
    recentPerformance: Record<string, { accuracy: number; avgTime: number }>
  ): Promise<ExamAIResponse> {
    const prompt = `
      Based on the student's recent performance, recommend specific topics for review.

      Weak Topics Identified: ${weakTopics.join(", ")}
      Recent Performance Details: ${JSON.stringify(recentPerformance)}

      For each weak topic, please provide:
      1. Specific sub-topics or concepts to focus on
      2. Recommended study resources (types of problems, explanations)
      3. Estimated time needed for review
      4. Prerequisite topics that should be reviewed first
      5. Common misconceptions to address

      Prioritize based on impact on overall score and foundational importance.
    `;

    const content = await this.invokeExamModel(prompt);

    return {
      type: ExamPromptType.TOPIC_RECOMMENDATION,
      content,
      confidence: 0.8,
      sources: weakTopics,
      metadata: { weakTopics, recentPerformance },
    };
  }

  // Private helper method
  private async invokeExamModel(prompt: string): Promise<string> {
    return invokeExamModel(prompt, this.config);
  }
}

// Export a default instance for convenience
export const examAIService = new ExamAIService();
