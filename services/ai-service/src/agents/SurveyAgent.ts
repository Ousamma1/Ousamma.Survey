/**
 * Survey Agent
 * AI agent specialized in survey-related tasks
 */

import { IAIProvider } from '../providers';
import { CompletionRequest } from '../types';

export class SurveyAgent {
  private provider: IAIProvider;

  constructor(provider: IAIProvider) {
    this.provider = provider;
  }

  /**
   * Generate a survey from a description
   */
  async generateSurvey(description: string, options: {
    questionCount?: number;
    language?: 'en' | 'ar' | 'bilingual';
    questionTypes?: string[];
    targetAudience?: string;
  } = {}): Promise<any> {
    const {
      questionCount = 10,
      language = 'bilingual',
      questionTypes = ['multiple_choice', 'paragraph', 'dropdown'],
      targetAudience = 'general'
    } = options;

    const prompt = this.buildGenerateSurveyPrompt(
      description,
      questionCount,
      language,
      questionTypes,
      targetAudience
    );

    const request: CompletionRequest = {
      prompt,
      maxTokens: 3000,
      temperature: 0.7
    };

    const response = await this.provider.generateCompletion(request);

    try {
      // Parse JSON response
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) ||
                       response.content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }

      return { error: 'Failed to parse survey JSON', rawResponse: response.content };
    } catch (error) {
      return { error: 'Failed to generate survey', rawResponse: response.content };
    }
  }

  /**
   * Optimize an existing survey
   */
  async optimizeSurvey(survey: any, optimizationGoals: string[] = []): Promise<any> {
    const goals = optimizationGoals.length > 0
      ? optimizationGoals.join(', ')
      : 'clarity, engagement, response rate';

    const prompt = `
You are a survey optimization expert. Analyze and optimize the following survey.

Current Survey:
${JSON.stringify(survey, null, 2)}

Optimization Goals: ${goals}

Please provide:
1. Optimized survey with improved questions
2. Explanation of changes made
3. Expected impact on response quality

Return the response in JSON format:
{
  "optimizedSurvey": { ... },
  "changes": [
    {
      "questionIndex": 0,
      "originalQuestion": "...",
      "optimizedQuestion": "...",
      "reason": "..."
    }
  ],
  "recommendations": ["...", "..."],
  "expectedImpact": "..."
}
`;

    const request: CompletionRequest = {
      prompt,
      maxTokens: 3000,
      temperature: 0.7
    };

    const response = await this.provider.generateCompletion(request);

    try {
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) ||
                       response.content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }

      return { error: 'Failed to parse optimization results', rawResponse: response.content };
    } catch (error) {
      return { error: 'Failed to optimize survey', rawResponse: response.content };
    }
  }

  /**
   * Analyze survey responses
   */
  async analyzeResponses(survey: any, responses: any[]): Promise<any> {
    const prompt = `
You are a survey analysis expert. Analyze the following survey responses.

Survey:
${JSON.stringify(survey, null, 2)}

Responses (${responses.length} total):
${JSON.stringify(responses.slice(0, 100), null, 2)}
${responses.length > 100 ? `\n... and ${responses.length - 100} more responses` : ''}

Please provide:
1. Response statistics
2. Key insights and patterns
3. Sentiment analysis
4. Recommendations based on findings

Return the response in JSON format:
{
  "statistics": {
    "totalResponses": ${responses.length},
    "completionRate": 0.0,
    "averageTimeSpent": "5 minutes",
    "questionStats": { ... }
  },
  "insights": [
    {
      "title": "...",
      "description": "...",
      "impact": "high|medium|low"
    }
  ],
  "sentiment": {
    "overall": "positive|neutral|negative",
    "breakdown": { ... }
  },
  "recommendations": ["...", "..."]
}
`;

    const request: CompletionRequest = {
      prompt,
      maxTokens: 3000,
      temperature: 0.7
    };

    const response = await this.provider.generateCompletion(request);

    try {
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) ||
                       response.content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }

      return { error: 'Failed to parse analysis results', rawResponse: response.content };
    } catch (error) {
      return { error: 'Failed to analyze responses', rawResponse: response.content };
    }
  }

  /**
   * Generate a report from survey data
   */
  async generateReport(survey: any, responses: any[], reportType: 'summary' | 'detailed' | 'executive' = 'summary'): Promise<string> {
    const prompt = `
You are a survey reporting expert. Generate a ${reportType} report for the following survey and responses.

Survey:
${JSON.stringify(survey, null, 2)}

Responses (${responses.length} total):
${JSON.stringify(responses.slice(0, 50), null, 2)}

Report Type: ${reportType}

Please generate a well-structured ${reportType} report in Markdown format that includes:
- Executive summary
- Key findings
- Detailed analysis (if detailed report)
- Visualizations recommendations
- Actionable recommendations
- Conclusion
`;

    const request: CompletionRequest = {
      prompt,
      maxTokens: 4000,
      temperature: 0.7
    };

    const response = await this.provider.generateCompletion(request);
    return response.content;
  }

  /**
   * Interpret survey data and provide insights
   */
  async interpretData(data: any, question: string): Promise<string> {
    const prompt = `
You are a data interpretation expert. Analyze the following survey data and answer the question.

Data:
${JSON.stringify(data, null, 2)}

Question: ${question}

Please provide a clear, concise answer with supporting evidence from the data.
`;

    const request: CompletionRequest = {
      prompt,
      maxTokens: 2000,
      temperature: 0.7
    };

    const response = await this.provider.generateCompletion(request);
    return response.content;
  }

  /**
   * Build prompt for survey generation
   */
  private buildGenerateSurveyPrompt(
    description: string,
    questionCount: number,
    language: string,
    questionTypes: string[],
    targetAudience: string
  ): string {
    const languageInstructions = language === 'bilingual'
      ? 'Create questions in both English and Arabic (question_en, question_ar, options_en, options_ar)'
      : language === 'ar'
      ? 'Create questions in Arabic only'
      : 'Create questions in English only';

    return `
You are an expert survey designer. Create a comprehensive survey based on the following requirements:

Description: ${description}
Number of Questions: ${questionCount}
Language: ${language}
Question Types: ${questionTypes.join(', ')}
Target Audience: ${targetAudience}

${languageInstructions}

Please create a survey with well-designed questions that:
1. Are clear and unambiguous
2. Avoid leading or biased language
3. Include appropriate question types
4. Have logical flow and grouping
5. Are appropriate for the target audience

Return the survey in JSON format:
{
  "title": "Survey Title",
  "description": "Survey Description",
  "questions": [
    {
      "type": "multiple_choice|paragraph|dropdown",
      "question_en": "Question in English",
      "question_ar": "السؤال بالعربية",
      "options_en": ["Option 1", "Option 2"],
      "options_ar": ["خيار 1", "خيار 2"],
      "required": true|false
    }
  ]
}
`;
  }
}
