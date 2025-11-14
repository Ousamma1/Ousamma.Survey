/**
 * SurveyResponse Model Unit Tests
 * Sprint 19: Testing & QA
 */

const mongoose = require('mongoose');
const SurveyResponse = require('../../../models/SurveyResponse');
const Survey = require('../../../models/Survey');
const dbHelper = require('../../../../../tests/helpers/db-helper');

describe('SurveyResponse Model', () => {
  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterEach(async () => {
    await dbHelper.clearDatabase();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  describe('Schema Validation', () => {
    it('should create a valid survey response', async () => {
      const responseData = {
        responseId: 'resp-123',
        surveyId: 'survey-456',
        userId: 'user-789',
        answers: [
          {
            questionId: 'q1',
            value: 'John Doe',
            questionType: 'text'
          }
        ],
        status: 'in_progress'
      };

      const response = new SurveyResponse(responseData);
      const savedResponse = await response.save();

      expect(savedResponse._id).toBeDefined();
      expect(savedResponse.responseId).toBe('resp-123');
      expect(savedResponse.surveyId).toBe('survey-456');
      expect(savedResponse.answers).toHaveLength(1);
      expect(savedResponse.status).toBe('in_progress');
    });

    it('should require responseId', async () => {
      const response = new SurveyResponse({
        surveyId: 'survey-123'
      });

      await expect(response.save()).rejects.toThrow();
    });

    it('should require surveyId', async () => {
      const response = new SurveyResponse({
        responseId: 'resp-123'
      });

      await expect(response.save()).rejects.toThrow();
    });

    it('should enforce unique responseId', async () => {
      await new SurveyResponse({
        responseId: 'duplicate-resp',
        surveyId: 'survey-123'
      }).save();

      const duplicate = new SurveyResponse({
        responseId: 'duplicate-resp',
        surveyId: 'survey-456'
      });

      await expect(duplicate.save()).rejects.toThrow();
    });

    it('should validate status enum', async () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456',
        status: 'invalid_status'
      });

      await expect(response.save()).rejects.toThrow();
    });

    it('should default status to in_progress', async () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456'
      });

      expect(response.status).toBe('in_progress');
    });

    it('should default isComplete to false', async () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456'
      });

      expect(response.isComplete).toBe(false);
    });
  });

  describe('setAnswer() Method', () => {
    it('should add a new answer', () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456'
      });

      response.setAnswer('q1', 'Answer 1', { questionType: 'text' });

      expect(response.answers).toHaveLength(1);
      expect(response.answers[0].questionId).toBe('q1');
      expect(response.answers[0].value).toBe('Answer 1');
      expect(response.answers[0].questionType).toBe('text');
    });

    it('should update existing answer', () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456',
        answers: [
          {
            questionId: 'q1',
            value: 'Old Answer'
          }
        ]
      });

      response.setAnswer('q1', 'New Answer');

      expect(response.answers).toHaveLength(1);
      expect(response.answers[0].value).toBe('New Answer');
    });

    it('should handle file uploads', () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456'
      });

      const files = [
        {
          filename: 'file1.pdf',
          originalName: 'document.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'https://example.com/file1.pdf',
          uploadedAt: new Date()
        }
      ];

      response.setAnswer('q1', null, { questionType: 'file_upload', files });

      expect(response.answers[0].files).toHaveLength(1);
      expect(response.answers[0].files[0].filename).toBe('file1.pdf');
    });

    it('should handle signature capture', () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456'
      });

      const signature = {
        dataUrl: 'data:image/png;base64,iVBORw0KGgo...',
        timestamp: new Date()
      };

      response.setAnswer('q1', null, { questionType: 'signature', signature });

      expect(response.answers[0].signature).toBeDefined();
      expect(response.answers[0].signature.dataUrl).toContain('data:image/png');
    });

    it('should handle location data', () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456'
      });

      const location = {
        type: 'Point',
        coordinates: [-74.006, 40.7128],
        accuracy: 10,
        timestamp: new Date()
      };

      response.setAnswer('q1', null, { questionType: 'location', location });

      expect(response.answers[0].location).toBeDefined();
      expect(response.answers[0].location.coordinates).toEqual([-74.006, 40.7128]);
    });

    it('should track time spent on question', () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456'
      });

      response.setAnswer('q1', 'Answer', { timeSpent: 45 });

      expect(response.answers[0].timeSpent).toBe(45);
    });

    it('should update progress after setting answer', () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456',
        progress: {
          questionsAnswered: 0
        }
      });

      response.setAnswer('q1', 'Answer 1');
      expect(response.progress.questionsAnswered).toBe(1);

      response.setAnswer('q2', 'Answer 2');
      expect(response.progress.questionsAnswered).toBe(2);
    });
  });

  describe('getAnswer() Method', () => {
    it('should return answer value for existing question', () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456',
        answers: [
          { questionId: 'q1', value: 'Answer 1' },
          { questionId: 'q2', value: 'Answer 2' }
        ]
      });

      expect(response.getAnswer('q1')).toBe('Answer 1');
      expect(response.getAnswer('q2')).toBe('Answer 2');
    });

    it('should return null for non-existent question', () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456',
        answers: []
      });

      expect(response.getAnswer('q1')).toBeNull();
    });
  });

  describe('updateProgress() Method', () => {
    it('should update questions answered count', () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456',
        answers: [
          { questionId: 'q1', value: 'A1' },
          { questionId: 'q2', value: 'A2' },
          { questionId: 'q3', value: 'A3' }
        ]
      });

      response.updateProgress();

      expect(response.progress.questionsAnswered).toBe(3);
    });

    it('should calculate percentage when total provided', () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456',
        answers: [
          { questionId: 'q1', value: 'A1' },
          { questionId: 'q2', value: 'A2' }
        ]
      });

      response.updateProgress(10);

      expect(response.progress.totalQuestions).toBe(10);
      expect(response.progress.percentage).toBe(20); // 2/10 * 100
    });

    it('should update lastSavedAt timestamp', () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456'
      });

      const beforeUpdate = response.lastSavedAt;
      response.updateProgress();

      expect(response.lastSavedAt).toBeDefined();
      expect(response.lastSavedAt).not.toEqual(beforeUpdate);
    });
  });

  describe('complete() Method', () => {
    it('should mark response as completed', () => {
      const startedAt = new Date(Date.now() - 120000); // 2 minutes ago
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456',
        startedAt
      });

      response.complete();

      expect(response.status).toBe('completed');
      expect(response.isComplete).toBe(true);
      expect(response.completedAt).toBeInstanceOf(Date);
      expect(response.submittedAt).toBeInstanceOf(Date);
      expect(response.progress.percentage).toBe(100);
    });

    it('should calculate completion time', () => {
      const startedAt = new Date(Date.now() - 120000); // 2 minutes ago
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456',
        startedAt
      });

      response.complete();

      expect(response.completionTime).toBeGreaterThan(0);
      expect(response.completionTime).toBeCloseTo(120, -1); // ~120 seconds
    });

    it('should handle completion without startedAt', () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456'
      });

      response.complete();

      expect(response.status).toBe('completed');
      expect(response.completionTime).toBeUndefined();
    });
  });

  describe('generateSaveToken() Method', () => {
    it('should generate unique save token', () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456'
      });

      const token = response.generateSaveToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      expect(response.saveToken).toBe(token);
    });

    it('should update lastSavedAt timestamp', () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456'
      });

      response.generateSaveToken();

      expect(response.lastSavedAt).toBeInstanceOf(Date);
    });

    it('should generate different tokens on successive calls', () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456'
      });

      const token1 = response.generateSaveToken();
      const token2 = response.generateSaveToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('validate() Method', () => {
    it('should pass validation for valid response', async () => {
      const survey = new Survey({
        surveyId: 'survey-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        questions: [
          {
            questionId: 'q1',
            type: 'text',
            text: new Map([['en', 'Q1']]),
            required: true
          },
          {
            questionId: 'q2',
            type: 'text',
            text: new Map([['en', 'Q2']]),
            required: false
          }
        ]
      });

      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-123',
        answers: [
          { questionId: 'q1', value: 'Answer 1' }
        ]
      });

      const isValid = await response.validate(survey);
      expect(isValid).toBe(true);
      expect(response.validationErrors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', async () => {
      const survey = new Survey({
        surveyId: 'survey-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        questions: [
          {
            questionId: 'q1',
            type: 'text',
            text: new Map([['en', 'Q1']]),
            required: true
          }
        ]
      });

      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-123',
        answers: []
      });

      const isValid = await response.validate(survey);
      expect(isValid).toBe(false);
      expect(response.validationErrors).toHaveLength(1);
      expect(response.validationErrors[0].questionId).toBe('q1');
    });

    it('should validate minLength constraint', async () => {
      const survey = new Survey({
        surveyId: 'survey-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        questions: [
          {
            questionId: 'q1',
            type: 'text',
            text: new Map([['en', 'Q1']]),
            validation: {
              minLength: 10
            }
          }
        ]
      });

      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-123',
        answers: [
          { questionId: 'q1', value: 'short' }
        ]
      });

      const isValid = await response.validate(survey);
      expect(isValid).toBe(false);
      expect(response.validationErrors[0].error).toContain('Minimum length');
    });

    it('should validate maxLength constraint', async () => {
      const survey = new Survey({
        surveyId: 'survey-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        questions: [
          {
            questionId: 'q1',
            type: 'text',
            text: new Map([['en', 'Q1']]),
            validation: {
              maxLength: 5
            }
          }
        ]
      });

      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-123',
        answers: [
          { questionId: 'q1', value: 'too long answer' }
        ]
      });

      const isValid = await response.validate(survey);
      expect(isValid).toBe(false);
      expect(response.validationErrors[0].error).toContain('Maximum length');
    });

    it('should validate minValue constraint', async () => {
      const survey = new Survey({
        surveyId: 'survey-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        questions: [
          {
            questionId: 'q1',
            type: 'scale',
            text: new Map([['en', 'Q1']]),
            validation: {
              minValue: 1,
              maxValue: 10
            }
          }
        ]
      });

      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-123',
        answers: [
          { questionId: 'q1', value: 0 }
        ]
      });

      const isValid = await response.validate(survey);
      expect(isValid).toBe(false);
      expect(response.validationErrors[0].error).toContain('Minimum value');
    });

    it('should validate pattern constraint', async () => {
      const survey = new Survey({
        surveyId: 'survey-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        questions: [
          {
            questionId: 'q1',
            type: 'text',
            text: new Map([['en', 'Email']]),
            validation: {
              pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$'
            }
          }
        ]
      });

      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-123',
        answers: [
          { questionId: 'q1', value: 'invalid-email' }
        ]
      });

      const isValid = await response.validate(survey);
      expect(isValid).toBe(false);
      expect(response.validationErrors[0].error).toContain('does not match');
    });
  });

  describe('getSummary() Method', () => {
    it('should return response summary', () => {
      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'survey-456',
        status: 'completed',
        isComplete: true,
        answers: [
          { questionId: 'q1', value: 'A1' },
          { questionId: 'q2', value: 'A2' }
        ],
        completionTime: 120,
        startedAt: new Date('2024-01-01'),
        completedAt: new Date('2024-01-01'),
        metadata: {
          device: 'mobile'
        },
        progress: {
          percentage: 100
        }
      });

      const summary = response.getSummary();

      expect(summary).toHaveProperty('responseId', 'resp-123');
      expect(summary).toHaveProperty('surveyId', 'survey-456');
      expect(summary).toHaveProperty('status', 'completed');
      expect(summary).toHaveProperty('isComplete', true);
      expect(summary).toHaveProperty('progress', 100);
      expect(summary).toHaveProperty('answersCount', 2);
      expect(summary).toHaveProperty('completionTime', 120);
      expect(summary).toHaveProperty('device', 'mobile');
    });
  });

  describe('Static Methods', () => {
    describe('findBySaveToken()', () => {
      it('should find in-progress response by save token', async () => {
        const response = await new SurveyResponse({
          responseId: 'resp-123',
          surveyId: 'survey-456',
          saveToken: 'token-abc123',
          status: 'in_progress'
        }).save();

        const found = await SurveyResponse.findBySaveToken('token-abc123');
        expect(found).toBeDefined();
        expect(found.responseId).toBe('resp-123');
      });

      it('should not find completed responses', async () => {
        await new SurveyResponse({
          responseId: 'resp-123',
          surveyId: 'survey-456',
          saveToken: 'token-abc123',
          status: 'completed'
        }).save();

        const found = await SurveyResponse.findBySaveToken('token-abc123');
        expect(found).toBeNull();
      });
    });

    describe('findUserResponses()', () => {
      it('should find all responses for a user and survey', async () => {
        await new SurveyResponse({
          responseId: 'resp-1',
          surveyId: 'survey-123',
          userId: 'user-456'
        }).save();

        await new SurveyResponse({
          responseId: 'resp-2',
          surveyId: 'survey-123',
          userId: 'user-456'
        }).save();

        await new SurveyResponse({
          responseId: 'resp-3',
          surveyId: 'survey-123',
          userId: 'user-789'
        }).save();

        const responses = await SurveyResponse.findUserResponses('survey-123', 'user-456');
        expect(responses).toHaveLength(2);
      });

      it('should return empty array if no responses found', async () => {
        const responses = await SurveyResponse.findUserResponses('survey-999', 'user-999');
        expect(responses).toHaveLength(0);
      });
    });

    describe('getCompletionRate()', () => {
      it('should calculate completion rate correctly', async () => {
        await new SurveyResponse({
          responseId: 'resp-1',
          surveyId: 'survey-123',
          isComplete: true
        }).save();

        await new SurveyResponse({
          responseId: 'resp-2',
          surveyId: 'survey-123',
          isComplete: true
        }).save();

        await new SurveyResponse({
          responseId: 'resp-3',
          surveyId: 'survey-123',
          isComplete: false
        }).save();

        await new SurveyResponse({
          responseId: 'resp-4',
          surveyId: 'survey-123',
          isComplete: false
        }).save();

        const rate = await SurveyResponse.getCompletionRate('survey-123');
        expect(rate).toBe(50); // 2 out of 4 = 50%
      });

      it('should return 0 for surveys with no responses', async () => {
        const rate = await SurveyResponse.getCompletionRate('survey-999');
        expect(rate).toBe(0);
      });
    });

    describe('getAverageCompletionTime()', () => {
      it('should calculate average completion time', async () => {
        await new SurveyResponse({
          responseId: 'resp-1',
          surveyId: 'survey-123',
          isComplete: true,
          completionTime: 100
        }).save();

        await new SurveyResponse({
          responseId: 'resp-2',
          surveyId: 'survey-123',
          isComplete: true,
          completionTime: 200
        }).save();

        await new SurveyResponse({
          responseId: 'resp-3',
          surveyId: 'survey-123',
          isComplete: true,
          completionTime: 300
        }).save();

        const avgTime = await SurveyResponse.getAverageCompletionTime('survey-123');
        expect(avgTime).toBe(200); // (100 + 200 + 300) / 3
      });

      it('should return null for surveys with no completed responses', async () => {
        const avgTime = await SurveyResponse.getAverageCompletionTime('survey-999');
        expect(avgTime).toBeNull();
      });
    });

    describe('cleanupAbandoned()', () => {
      it('should mark old in-progress responses as abandoned', async () => {
        const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days ago

        await new SurveyResponse({
          responseId: 'resp-old',
          surveyId: 'survey-123',
          status: 'in_progress',
          lastSavedAt: oldDate
        }).save();

        await new SurveyResponse({
          responseId: 'resp-recent',
          surveyId: 'survey-123',
          status: 'in_progress',
          lastSavedAt: new Date()
        }).save();

        const count = await SurveyResponse.cleanupAbandoned(30);

        expect(count).toBe(1);

        const abandoned = await SurveyResponse.findOne({ responseId: 'resp-old' });
        expect(abandoned.status).toBe('abandoned');

        const active = await SurveyResponse.findOne({ responseId: 'resp-recent' });
        expect(active.status).toBe('in_progress');
      });
    });
  });
});
