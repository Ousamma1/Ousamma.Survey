/**
 * Survey Model Unit Tests
 * Sprint 19: Testing & QA
 */

const mongoose = require('mongoose');
const Survey = require('../../../models/Survey');
const SurveyResponse = require('../../../models/SurveyResponse');
const dbHelper = require('../../../../../tests/helpers/db-helper');
const { createMockSurvey, createMockResponse } = require('../../../../../tests/helpers/mock-data');

describe('Survey Model', () => {
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
    it('should create a valid survey', async () => {
      const surveyData = {
        surveyId: 'test-survey-1',
        title: new Map([['en', 'Test Survey'], ['ar', 'استطلاع اختبار']]),
        description: new Map([['en', 'Test Description']]),
        createdBy: 'user-123',
        questions: [
          {
            questionId: 'q1',
            type: 'text',
            text: new Map([['en', 'What is your name?']]),
            required: true,
            order: 1
          }
        ],
        status: 'draft'
      };

      const survey = new Survey(surveyData);
      const savedSurvey = await survey.save();

      expect(savedSurvey._id).toBeDefined();
      expect(savedSurvey.surveyId).toBe('test-survey-1');
      expect(savedSurvey.title.get('en')).toBe('Test Survey');
      expect(savedSurvey.questions).toHaveLength(1);
      expect(savedSurvey.status).toBe('draft');
    });

    it('should require surveyId', async () => {
      const survey = new Survey({
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123'
      });

      await expect(survey.save()).rejects.toThrow();
    });

    it('should require title', async () => {
      const survey = new Survey({
        surveyId: 'test-123',
        createdBy: 'user-123'
      });

      await expect(survey.save()).rejects.toThrow();
    });

    it('should require createdBy', async () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']])
      });

      await expect(survey.save()).rejects.toThrow();
    });

    it('should enforce unique surveyId', async () => {
      const survey1 = new Survey({
        surveyId: 'duplicate-id',
        title: new Map([['en', 'Survey 1']]),
        createdBy: 'user-123'
      });
      await survey1.save();

      const survey2 = new Survey({
        surveyId: 'duplicate-id',
        title: new Map([['en', 'Survey 2']]),
        createdBy: 'user-456'
      });

      await expect(survey2.save()).rejects.toThrow();
    });

    it('should validate question types', async () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        questions: [
          {
            questionId: 'q1',
            type: 'invalid_type',
            text: new Map([['en', 'Test?']])
          }
        ]
      });

      await expect(survey.save()).rejects.toThrow();
    });

    it('should validate status enum', async () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'invalid_status'
      });

      await expect(survey.save()).rejects.toThrow();
    });
  });

  describe('isActive() Method', () => {
    it('should return true for active survey within date range', async () => {
      const now = new Date();
      const survey = new Survey({
        surveyId: 'test-active',
        title: new Map([['en', 'Active Survey']]),
        createdBy: 'user-123',
        status: 'active',
        settings: {
          startDate: new Date(now.getTime() - 86400000), // 1 day ago
          endDate: new Date(now.getTime() + 86400000)    // 1 day from now
        }
      });

      expect(survey.isActive()).toBe(true);
    });

    it('should return false for non-active status', async () => {
      const survey = new Survey({
        surveyId: 'test-draft',
        title: new Map([['en', 'Draft Survey']]),
        createdBy: 'user-123',
        status: 'draft'
      });

      expect(survey.isActive()).toBe(false);
    });

    it('should return false if start date is in future', async () => {
      const now = new Date();
      const survey = new Survey({
        surveyId: 'test-future',
        title: new Map([['en', 'Future Survey']]),
        createdBy: 'user-123',
        status: 'active',
        settings: {
          startDate: new Date(now.getTime() + 86400000) // 1 day from now
        }
      });

      expect(survey.isActive()).toBe(false);
    });

    it('should return false if end date is in past', async () => {
      const now = new Date();
      const survey = new Survey({
        surveyId: 'test-past',
        title: new Map([['en', 'Past Survey']]),
        createdBy: 'user-123',
        status: 'active',
        settings: {
          endDate: new Date(now.getTime() - 86400000) // 1 day ago
        }
      });

      expect(survey.isActive()).toBe(false);
    });

    it('should return false if max responses reached', async () => {
      const survey = new Survey({
        surveyId: 'test-max',
        title: new Map([['en', 'Max Survey']]),
        createdBy: 'user-123',
        status: 'active',
        settings: {
          maxResponses: 100
        },
        stats: {
          totalResponses: 100
        }
      });

      expect(survey.isActive()).toBe(false);
    });

    it('should return true if max responses not reached', async () => {
      const survey = new Survey({
        surveyId: 'test-under-max',
        title: new Map([['en', 'Under Max Survey']]),
        createdBy: 'user-123',
        status: 'active',
        settings: {
          maxResponses: 100
        },
        stats: {
          totalResponses: 50
        }
      });

      expect(survey.isActive()).toBe(true);
    });
  });

  describe('getPublicUrl() Method', () => {
    it('should return custom slug URL if set', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        settings: {
          customSlug: 'my-custom-survey'
        }
      });

      const url = survey.getPublicUrl('https://example.com');
      expect(url).toBe('https://example.com/s/my-custom-survey');
    });

    it('should return surveyId URL if no custom slug', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123'
      });

      const url = survey.getPublicUrl('https://example.com');
      expect(url).toBe('https://example.com/survey/test-123');
    });

    it('should work with empty baseUrl', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123'
      });

      const url = survey.getPublicUrl();
      expect(url).toBe('/survey/test-123');
    });
  });

  describe('generateUniqueLink() Method', () => {
    it('should generate unique link with default label', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123'
      });

      const link = survey.generateUniqueLink();

      expect(link).toHaveProperty('linkId');
      expect(link).toHaveProperty('code');
      expect(link.label).toBe('Link 1');
      expect(link.usedCount).toBe(0);
      expect(survey.distribution.uniqueLinks).toHaveLength(1);
    });

    it('should generate unique link with custom options', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123'
      });

      const expiresAt = new Date(Date.now() + 86400000);
      const link = survey.generateUniqueLink({
        label: 'Custom Label',
        maxUses: 50,
        expiresAt
      });

      expect(link.label).toBe('Custom Label');
      expect(link.maxUses).toBe(50);
      expect(link.expiresAt).toEqual(expiresAt);
    });

    it('should increment link count for label', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123'
      });

      survey.generateUniqueLink();
      const link2 = survey.generateUniqueLink();

      expect(link2.label).toBe('Link 2');
      expect(survey.distribution.uniqueLinks).toHaveLength(2);
    });
  });

  describe('validateAccessCode() Method', () => {
    it('should return true if access code not required', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        settings: {
          requireAccessCode: false
        }
      });

      expect(survey.validateAccessCode('any-code')).toBe(true);
    });

    it('should return true for valid access code', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        settings: {
          requireAccessCode: true,
          accessCodes: ['CODE123', 'CODE456']
        }
      });

      expect(survey.validateAccessCode('CODE123')).toBe(true);
      expect(survey.validateAccessCode('CODE456')).toBe(true);
    });

    it('should return false for invalid access code', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        settings: {
          requireAccessCode: true,
          accessCodes: ['CODE123']
        }
      });

      expect(survey.validateAccessCode('WRONG')).toBe(false);
    });
  });

  describe('canSubmitResponse() Method', () => {
    it('should allow submission for active survey', async () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'active'
      });

      const result = await survey.canSubmitResponse();
      expect(result.allowed).toBe(true);
    });

    it('should not allow submission for inactive survey', async () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'draft'
      });

      const result = await survey.canSubmitResponse();
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Survey is not active');
    });

    it('should not allow submission if max responses reached', async () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'active',
        settings: {
          maxResponses: 10
        },
        stats: {
          totalResponses: 10
        }
      });

      const result = await survey.canSubmitResponse();
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Maximum responses reached');
    });

    it('should check user-specific response limits', async () => {
      const survey = await new Survey({
        surveyId: 'test-user-limit',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'active',
        settings: {
          maxResponsesPerUser: 2
        }
      }).save();

      // Create 2 responses for the user
      await new SurveyResponse({
        responseId: 'resp-1',
        surveyId: 'test-user-limit',
        userId: 'user-456',
        answers: []
      }).save();

      await new SurveyResponse({
        responseId: 'resp-2',
        surveyId: 'test-user-limit',
        userId: 'user-456',
        answers: []
      }).save();

      const result = await survey.canSubmitResponse('user-456');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Maximum responses per user reached');
    });
  });

  describe('incrementResponseCount() Method', () => {
    it('should increment total responses', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        stats: {
          totalResponses: 5,
          completedResponses: 3
        }
      });

      survey.incrementResponseCount(false);

      expect(survey.stats.totalResponses).toBe(6);
      expect(survey.stats.completedResponses).toBe(3);
      expect(survey.stats.lastResponseAt).toBeInstanceOf(Date);
    });

    it('should increment completed responses when completed is true', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        stats: {
          totalResponses: 5,
          completedResponses: 3
        }
      });

      survey.incrementResponseCount(true);

      expect(survey.stats.totalResponses).toBe(6);
      expect(survey.stats.completedResponses).toBe(4);
    });
  });

  describe('getQuestionsBySection() Method', () => {
    it('should return questions for a section', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        questions: [
          {
            questionId: 'q1',
            type: 'text',
            text: new Map([['en', 'Q1']]),
            sectionId: 'section-1'
          },
          {
            questionId: 'q2',
            type: 'text',
            text: new Map([['en', 'Q2']]),
            sectionId: 'section-1'
          },
          {
            questionId: 'q3',
            type: 'text',
            text: new Map([['en', 'Q3']]),
            sectionId: 'section-2'
          }
        ]
      });

      const section1Questions = survey.getQuestionsBySection('section-1');
      expect(section1Questions).toHaveLength(2);
      expect(section1Questions[0].questionId).toBe('q1');
      expect(section1Questions[1].questionId).toBe('q2');
    });

    it('should return empty array for non-existent section', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        questions: []
      });

      const questions = survey.getQuestionsBySection('non-existent');
      expect(questions).toHaveLength(0);
    });
  });

  describe('evaluateConditionalLogic() Method', () => {
    it('should return visible true if no conditional logic', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        questions: [
          {
            questionId: 'q1',
            type: 'text',
            text: new Map([['en', 'Q1']]),
            conditionalLogic: { enabled: false }
          }
        ]
      });

      const result = survey.evaluateConditionalLogic('q1', {});
      expect(result.visible).toBe(true);
      expect(result.action).toBeNull();
    });

    it('should evaluate show condition correctly', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        questions: [
          {
            questionId: 'q2',
            type: 'text',
            text: new Map([['en', 'Q2']]),
            conditionalLogic: {
              enabled: true,
              rules: [
                {
                  condition: 'show',
                  trigger: {
                    questionId: 'q1',
                    operator: 'equals',
                    value: 'yes'
                  },
                  action: {}
                }
              ]
            }
          }
        ]
      });

      const resultMatch = survey.evaluateConditionalLogic('q2', { q1: 'yes' });
      expect(resultMatch.visible).toBe(true);

      const resultNoMatch = survey.evaluateConditionalLogic('q2', { q1: 'no' });
      expect(resultNoMatch.visible).toBe(true); // Falls back to visible
    });

    it('should evaluate hide condition correctly', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        questions: [
          {
            questionId: 'q2',
            type: 'text',
            text: new Map([['en', 'Q2']]),
            conditionalLogic: {
              enabled: true,
              rules: [
                {
                  condition: 'hide',
                  trigger: {
                    questionId: 'q1',
                    operator: 'equals',
                    value: 'no'
                  },
                  action: {}
                }
              ]
            }
          }
        ]
      });

      const result = survey.evaluateConditionalLogic('q2', { q1: 'no' });
      expect(result.visible).toBe(false);
    });
  });

  describe('_evaluateCondition() Method', () => {
    let survey;

    beforeEach(() => {
      survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123'
      });
    });

    it('should evaluate equals operator', () => {
      expect(survey._evaluateCondition('value', 'equals', 'value')).toBe(true);
      expect(survey._evaluateCondition('value', 'equals', 'other')).toBe(false);
    });

    it('should evaluate not_equals operator', () => {
      expect(survey._evaluateCondition('value', 'not_equals', 'other')).toBe(true);
      expect(survey._evaluateCondition('value', 'not_equals', 'value')).toBe(false);
    });

    it('should evaluate contains operator', () => {
      expect(survey._evaluateCondition(['a', 'b', 'c'], 'contains', 'b')).toBe(true);
      expect(survey._evaluateCondition('hello world', 'contains', 'world')).toBe(true);
      expect(survey._evaluateCondition(['a', 'b'], 'contains', 'c')).toBe(false);
    });

    it('should evaluate greater_than operator', () => {
      expect(survey._evaluateCondition(10, 'greater_than', 5)).toBe(true);
      expect(survey._evaluateCondition(5, 'greater_than', 10)).toBe(false);
    });

    it('should evaluate less_than operator', () => {
      expect(survey._evaluateCondition(5, 'less_than', 10)).toBe(true);
      expect(survey._evaluateCondition(10, 'less_than', 5)).toBe(false);
    });

    it('should evaluate is_empty operator', () => {
      expect(survey._evaluateCondition('', 'is_empty', null)).toBe(true);
      expect(survey._evaluateCondition([], 'is_empty', null)).toBe(true);
      expect(survey._evaluateCondition('value', 'is_empty', null)).toBe(false);
    });

    it('should evaluate is_not_empty operator', () => {
      expect(survey._evaluateCondition('value', 'is_not_empty', null)).toBe(true);
      expect(survey._evaluateCondition('', 'is_not_empty', null)).toBe(false);
    });
  });

  describe('applyPiping() Method', () => {
    it('should return plain text if piping not enabled', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        questions: [
          {
            questionId: 'q1',
            type: 'text',
            text: new Map([['en', 'What is your name?']]),
            piping: { enabled: false }
          }
        ]
      });

      const result = survey.applyPiping('q1', {}, 'en');
      expect(result).toBe('What is your name?');
    });

    it('should replace piping placeholders with answers', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        questions: [
          {
            questionId: 'q2',
            type: 'text',
            text: new Map([['en', 'Template']]),
            piping: {
              enabled: true,
              template: 'You said your name is {{q1}}, correct?',
              sources: [
                { questionId: 'q1', placeholder: '{{q1}}' }
              ]
            }
          }
        ]
      });

      const result = survey.applyPiping('q2', { q1: 'John' }, 'en');
      expect(result).toBe('You said your name is John, correct?');
    });

    it('should handle multiple placeholders', () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        questions: [
          {
            questionId: 'q3',
            type: 'text',
            text: new Map([['en', 'Template']]),
            piping: {
              enabled: true,
              template: 'Hello {{q1}}, you are {{q2}} years old',
              sources: [
                { questionId: 'q1', placeholder: '{{q1}}' },
                { questionId: 'q2', placeholder: '{{q2}}' }
              ]
            }
          }
        ]
      });

      const result = survey.applyPiping('q3', { q1: 'Alice', q2: '25' }, 'en');
      expect(result).toBe('Hello Alice, you are 25 years old');
    });
  });

  describe('Static Methods', () => {
    describe('findBySlugOrId()', () => {
      it('should find survey by surveyId', async () => {
        await new Survey({
          surveyId: 'test-123',
          title: new Map([['en', 'Test']]),
          createdBy: 'user-123'
        }).save();

        const found = await Survey.findBySlugOrId('test-123');
        expect(found).toBeDefined();
        expect(found.surveyId).toBe('test-123');
      });

      it('should find survey by custom slug', async () => {
        await new Survey({
          surveyId: 'test-456',
          title: new Map([['en', 'Test']]),
          createdBy: 'user-123',
          settings: {
            customSlug: 'my-survey'
          }
        }).save();

        const found = await Survey.findBySlugOrId('my-survey');
        expect(found).toBeDefined();
        expect(found.surveyId).toBe('test-456');
        expect(found.settings.customSlug).toBe('my-survey');
      });

      it('should return null for non-existent identifier', async () => {
        const found = await Survey.findBySlugOrId('non-existent');
        expect(found).toBeNull();
      });
    });
  });
});
