/**
 * Survey Service API Integration Tests
 * Sprint 19: Testing & QA
 *
 * Tests the full HTTP API endpoints with database integration
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Survey = require('../../services/survey-service/models/Survey');
const SurveyResponse = require('../../services/survey-service/models/SurveyResponse');
const surveyController = require('../../services/survey-service/controllers/surveyController');
const dbHelper = require('../../tests/helpers/db-helper');
const { generateTestToken, expectValidResponse } = require('../../tests/helpers/api-helper');

// Create test app
const app = express();
app.use(express.json());

// Mount survey routes
app.post('/api/surveys', surveyController.createSurvey.bind(surveyController));
app.get('/api/surveys/:identifier', surveyController.getSurvey.bind(surveyController));
app.put('/api/surveys/:surveyId', surveyController.updateSurvey.bind(surveyController));
app.delete('/api/surveys/:surveyId', surveyController.deleteSurvey.bind(surveyController));
app.post('/api/surveys/:surveyId/distribution/link', surveyController.generateDistributionLink.bind(surveyController));
app.post('/api/surveys/:surveyId/distribution/qr', surveyController.generateQRCode.bind(surveyController));
app.post('/api/surveys/:surveyId/responses', surveyController.submitResponse.bind(surveyController));
app.post('/api/surveys/:surveyId/responses/save', surveyController.saveResponse.bind(surveyController));
app.get('/api/surveys/:surveyId/analytics', surveyController.getAnalytics.bind(surveyController));
app.get('/api/surveys', surveyController.listSurveys.bind(surveyController));

describe('Survey API Integration Tests', () => {
  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterEach(async () => {
    await dbHelper.clearDatabase();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  describe('POST /api/surveys', () => {
    it('should create a new survey', async () => {
      const surveyData = {
        title: {
          en: 'Customer Satisfaction Survey',
          ar: 'استطلاع رضا العملاء'
        },
        description: {
          en: 'Help us improve our services'
        },
        questions: [
          {
            questionId: 'q1',
            type: 'scale',
            text: { en: 'How satisfied are you?' },
            required: true,
            scaleSettings: {
              min: 1,
              max: 5
            }
          },
          {
            questionId: 'q2',
            type: 'paragraph',
            text: { en: 'Additional comments?' },
            required: false
          }
        ],
        languages: {
          available: ['en', 'ar'],
          default: 'en'
        },
        settings: {
          allowAnonymous: true,
          showProgressBar: true
        },
        createdBy: 'user-123'
      };

      const response = await request(app)
        .post('/api/surveys')
        .send(surveyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('surveyId');
      expect(response.body.data.questions).toHaveLength(2);
    });
  });

  describe('GET /api/surveys/:identifier', () => {
    it('should get survey by ID', async () => {
      const survey = await new Survey({
        surveyId: 'test-survey-1',
        title: new Map([['en', 'Test Survey']]),
        createdBy: 'user-123',
        status: 'active'
      }).save();

      const response = await request(app)
        .get('/api/surveys/test-survey-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.surveyId).toBe('test-survey-1');
      expect(response.body.data.isActive).toBe(true);
    });

    it('should get survey by custom slug', async () => {
      const survey = await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test Survey']]),
        createdBy: 'user-123',
        settings: {
          customSlug: 'my-awesome-survey'
        }
      }).save();

      const response = await request(app)
        .get('/api/surveys/my-awesome-survey')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.surveyId).toBe('test-123');
    });

    it('should return 404 for non-existent survey', async () => {
      await request(app)
        .get('/api/surveys/non-existent')
        .expect(404);
    });
  });

  describe('PUT /api/surveys/:surveyId', () => {
    it('should update survey', async () => {
      await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Original']]),
        createdBy: 'user-123',
        status: 'draft'
      }).save();

      const response = await request(app)
        .put('/api/surveys/test-123')
        .send({
          status: 'active',
          updatedBy: 'user-456'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      const updated = await Survey.findOne({ surveyId: 'test-123' });
      expect(updated.status).toBe('active');
    });
  });

  describe('DELETE /api/surveys/:surveyId', () => {
    it('should archive survey by default', async () => {
      await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'active'
      }).save();

      const response = await request(app)
        .delete('/api/surveys/test-123')
        .expect(200);

      expect(response.body.message).toContain('archived');

      const archived = await Survey.findOne({ surveyId: 'test-123' });
      expect(archived.status).toBe('archived');
    });

    it('should permanently delete with permanent=true', async () => {
      await new Survey({
        surveyId: 'test-456',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123'
      }).save();

      await request(app)
        .delete('/api/surveys/test-456?permanent=true')
        .expect(200);

      const deleted = await Survey.findOne({ surveyId: 'test-456' });
      expect(deleted).toBeNull();
    });
  });

  describe('POST /api/surveys/:surveyId/distribution/link', () => {
    it('should generate unique distribution link', async () => {
      await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123'
      }).save();

      const response = await request(app)
        .post('/api/surveys/test-123/distribution/link')
        .send({
          label: 'Email Campaign',
          maxUses: 100,
          expiresAt: new Date(Date.now() + 86400000)
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('linkId');
      expect(response.body.data).toHaveProperty('code');
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.data.label).toBe('Email Campaign');
      expect(response.body.data.maxUses).toBe(100);
    });
  });

  describe('POST /api/surveys/:surveyId/distribution/qr', () => {
    it('should generate QR code', async () => {
      await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123'
      }).save();

      const response = await request(app)
        .post('/api/surveys/test-123/distribution/qr')
        .send({ size: 300 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('qrCodeId');
      expect(response.body.data).toHaveProperty('imageUrl');
      expect(response.body.data.imageUrl).toContain('data:image/png');
    });
  });

  describe('POST /api/surveys/:surveyId/responses', () => {
    it('should submit complete survey response', async () => {
      const survey = await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'active',
        questions: [
          {
            questionId: 'q1',
            type: 'text',
            text: new Map([['en', 'What is your name?']]),
            required: true
          },
          {
            questionId: 'q2',
            type: 'scale',
            text: new Map([['en', 'Rate us']]),
            required: false,
            scaleSettings: { min: 1, max: 5 }
          }
        ]
      }).save();

      const response = await request(app)
        .post('/api/surveys/test-123/responses')
        .send({
          answers: [
            { questionId: 'q1', value: 'John Doe' },
            { questionId: 'q2', value: 5 }
          ],
          userId: 'user-456',
          userName: 'John Doe',
          userEmail: 'john@example.com'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('responseId');

      // Verify response was saved
      const savedResponse = await SurveyResponse.findOne({
        responseId: response.body.data.responseId
      });
      expect(savedResponse).toBeDefined();
      expect(savedResponse.answers).toHaveLength(2);
      expect(savedResponse.isComplete).toBe(true);

      // Verify survey stats updated
      const updatedSurvey = await Survey.findOne({ surveyId: 'test-123' });
      expect(updatedSurvey.stats.totalResponses).toBe(1);
      expect(updatedSurvey.stats.completedResponses).toBe(1);
    });

    it('should reject response for inactive survey', async () => {
      await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'draft'
      }).save();

      await request(app)
        .post('/api/surveys/test-123/responses')
        .send({
          answers: [],
          userId: 'user-456'
        })
        .expect(403);
    });

    it('should validate required fields', async () => {
      await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'active',
        questions: [
          {
            questionId: 'q1',
            type: 'text',
            text: new Map([['en', 'Required question']]),
            required: true
          }
        ]
      }).save();

      const response = await request(app)
        .post('/api/surveys/test-123/responses')
        .send({
          answers: [], // Missing required answer
          userId: 'user-456'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should track distribution link usage', async () => {
      const survey = new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'active',
        questions: [
          {
            questionId: 'q1',
            type: 'text',
            text: new Map([['en', 'Test?']]),
            required: true
          }
        ]
      });

      const link = survey.generateUniqueLink({ label: 'Test Link' });
      await survey.save();

      await request(app)
        .post('/api/surveys/test-123/responses')
        .send({
          answers: [{ questionId: 'q1', value: 'Answer' }],
          source: {
            linkId: link.linkId
          }
        })
        .expect(200);

      const updatedSurvey = await Survey.findOne({ surveyId: 'test-123' });
      const updatedLink = updatedSurvey.distribution.uniqueLinks.find(
        l => l.linkId === link.linkId
      );
      expect(updatedLink.usedCount).toBe(1);
    });
  });

  describe('POST /api/surveys/:surveyId/responses/save', () => {
    it('should save partial response', async () => {
      await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'active',
        settings: {
          allowSaveResume: true
        },
        questions: [
          { questionId: 'q1', type: 'text', text: new Map([['en', 'Q1']]) },
          { questionId: 'q2', type: 'text', text: new Map([['en', 'Q2']]) },
          { questionId: 'q3', type: 'text', text: new Map([['en', 'Q3']]) }
        ]
      }).save();

      const response = await request(app)
        .post('/api/surveys/test-123/responses/save')
        .send({
          answers: [
            { questionId: 'q1', value: 'Answer 1' }
          ],
          userId: 'user-456',
          currentQuestionId: 'q2'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('saveToken');
      expect(response.body.data.progress.percentage).toBeGreaterThan(0);
    });

    it('should reject save if not allowed', async () => {
      await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'active',
        settings: {
          allowSaveResume: false
        }
      }).save();

      await request(app)
        .post('/api/surveys/test-123/responses/save')
        .send({
          answers: [],
          userId: 'user-456'
        })
        .expect(403);
    });
  });

  describe('GET /api/surveys/:surveyId/analytics', () => {
    it('should return survey analytics', async () => {
      const survey = await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'active'
      }).save();

      // Create responses
      await new SurveyResponse({
        responseId: 'resp-1',
        surveyId: 'test-123',
        isComplete: true,
        completionTime: 120
      }).save();

      await new SurveyResponse({
        responseId: 'resp-2',
        surveyId: 'test-123',
        isComplete: true,
        completionTime: 180
      }).save();

      await new SurveyResponse({
        responseId: 'resp-3',
        surveyId: 'test-123',
        isComplete: false
      }).save();

      const response = await request(app)
        .get('/api/surveys/test-123/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        surveyId: 'test-123',
        totalResponses: 3,
        completedResponses: 2,
        completionRate: expect.closeTo(66.67, 1),
        avgCompletionTime: 150,
        isActive: true
      });
    });
  });

  describe('GET /api/surveys', () => {
    beforeEach(async () => {
      await new Survey({
        surveyId: 'survey-1',
        title: new Map([['en', 'Active Survey 1']]),
        createdBy: 'user-123',
        status: 'active'
      }).save();

      await new Survey({
        surveyId: 'survey-2',
        title: new Map([['en', 'Draft Survey 2']]),
        createdBy: 'user-123',
        status: 'draft'
      }).save();

      await new Survey({
        surveyId: 'survey-3',
        title: new Map([['en', 'Active Survey 3']]),
        createdBy: 'user-456',
        status: 'active'
      }).save();
    });

    it('should list all surveys with pagination', async () => {
      const response = await request(app)
        .get('/api/surveys?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 3,
        pages: 1
      });
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/surveys?status=active')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(s => s.status === 'active')).toBe(true);
    });

    it('should search by title', async () => {
      const response = await request(app)
        .get('/api/surveys?search=Draft')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].surveyId).toBe('survey-2');
    });

    it('should sort results', async () => {
      const response = await request(app)
        .get('/api/surveys?sortBy=surveyId&sortOrder=asc')
        .expect(200);

      expect(response.body.data[0].surveyId).toBe('survey-1');
      expect(response.body.data[2].surveyId).toBe('survey-3');
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/surveys?page=2&limit=2')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.pages).toBe(2);
    });
  });
});
