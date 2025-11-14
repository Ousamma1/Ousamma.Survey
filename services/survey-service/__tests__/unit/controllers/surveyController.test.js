/**
 * Survey Controller Unit Tests
 * Sprint 19: Testing & QA
 */

const surveyController = require('../../../controllers/surveyController');
const Survey = require('../../../models/Survey');
const SurveyResponse = require('../../../models/SurveyResponse');
const dbHelper = require('../../../../../tests/helpers/db-helper');
const { mockRequest, mockResponse, mockNext } = require('../../../../../tests/helpers/api-helper');

describe('Survey Controller', () => {
  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterEach(async () => {
    await dbHelper.clearDatabase();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  describe('createSurvey()', () => {
    it('should create a new survey successfully', async () => {
      const req = mockRequest({
        body: {
          title: { en: 'Test Survey', ar: 'استطلاع اختبار' },
          description: { en: 'Test Description' },
          questions: [
            {
              questionId: 'q1',
              type: 'text',
              text: { en: 'What is your name?' },
              required: true
            }
          ],
          createdBy: 'user-123'
        },
        user: { id: 'user-123' }
      });
      const res = mockResponse();

      await surveyController.createSurvey(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            surveyId: expect.any(String)
          })
        })
      );
    });

    it('should handle errors during survey creation', async () => {
      const req = mockRequest({
        body: {
          // Missing required fields
          title: { en: 'Test' }
        }
      });
      const res = mockResponse();

      await surveyController.createSurvey(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String)
        })
      );
    });
  });

  describe('getSurvey()', () => {
    it('should return survey by surveyId', async () => {
      const survey = await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test Survey']]),
        createdBy: 'user-123',
        status: 'active'
      }).save();

      const req = mockRequest({
        params: { identifier: 'test-123' },
        query: { language: 'en' },
        protocol: 'https',
        get: jest.fn().mockReturnValue('example.com')
      });
      const res = mockResponse();

      await surveyController.getSurvey(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            surveyId: 'test-123',
            isActive: true,
            publicUrl: expect.stringContaining('test-123')
          })
        })
      );
    });

    it('should return 404 for non-existent survey', async () => {
      const req = mockRequest({
        params: { identifier: 'non-existent' },
        query: {}
      });
      const res = mockResponse();

      await surveyController.getSurvey(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Survey not found'
        })
      );
    });
  });

  describe('updateSurvey()', () => {
    it('should update survey successfully', async () => {
      await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Original Title']]),
        createdBy: 'user-123'
      }).save();

      const req = mockRequest({
        params: { surveyId: 'test-123' },
        body: {
          title: new Map([['en', 'Updated Title']]),
          status: 'active'
        },
        user: { id: 'user-456' }
      });
      const res = mockResponse();

      await surveyController.updateSurvey(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            surveyId: 'test-123'
          })
        })
      );
    });

    it('should return 404 for non-existent survey', async () => {
      const req = mockRequest({
        params: { surveyId: 'non-existent' },
        body: { status: 'active' }
      });
      const res = mockResponse();

      await surveyController.updateSurvey(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteSurvey()', () => {
    it('should archive survey by default', async () => {
      await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'active'
      }).save();

      const req = mockRequest({
        params: { surveyId: 'test-123' },
        query: { permanent: false }
      });
      const res = mockResponse();

      await surveyController.deleteSurvey(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Survey archived'
        })
      );

      const archived = await Survey.findOne({ surveyId: 'test-123' });
      expect(archived.status).toBe('archived');
    });

    it('should permanently delete survey when permanent=true', async () => {
      await new Survey({
        surveyId: 'test-456',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123'
      }).save();

      const req = mockRequest({
        params: { surveyId: 'test-456' },
        query: { permanent: true }
      });
      const res = mockResponse();

      await surveyController.deleteSurvey(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Survey deleted permanently'
        })
      );

      const deleted = await Survey.findOne({ surveyId: 'test-456' });
      expect(deleted).toBeNull();
    });
  });

  describe('generateDistributionLink()', () => {
    it('should generate unique distribution link', async () => {
      await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123'
      }).save();

      const req = mockRequest({
        params: { surveyId: 'test-123' },
        body: {
          label: 'Email Campaign',
          maxUses: 100
        },
        protocol: 'https',
        get: jest.fn().mockReturnValue('example.com')
      });
      const res = mockResponse();

      await surveyController.generateDistributionLink(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            linkId: expect.any(String),
            code: expect.any(String),
            label: 'Email Campaign',
            maxUses: 100,
            url: expect.stringContaining('survey/test-123')
          })
        })
      );
    });
  });

  describe('submitResponse()', () => {
    it('should submit complete response successfully', async () => {
      const survey = await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'active',
        questions: [
          {
            questionId: 'q1',
            type: 'text',
            text: new Map([['en', 'Name?']]),
            required: true
          }
        ]
      }).save();

      const req = mockRequest({
        params: { surveyId: 'test-123' },
        body: {
          answers: [
            { questionId: 'q1', value: 'John Doe' }
          ],
          userId: 'user-456'
        },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Test-Agent')
      });
      const res = mockResponse();

      await surveyController.submitResponse(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            responseId: expect.any(String)
          })
        })
      );

      // Verify survey stats updated
      const updatedSurvey = await Survey.findOne({ surveyId: 'test-123' });
      expect(updatedSurvey.stats.totalResponses).toBe(1);
      expect(updatedSurvey.stats.completedResponses).toBe(1);
    });

    it('should reject response if survey is inactive', async () => {
      await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'draft' // Not active
      }).save();

      const req = mockRequest({
        params: { surveyId: 'test-123' },
        body: {
          answers: [],
          userId: 'user-456'
        },
        ip: '127.0.0.1'
      });
      const res = mockResponse();

      await surveyController.submitResponse(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('not active')
        })
      );
    });

    it('should validate access code if required', async () => {
      await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'active',
        settings: {
          requireAccessCode: true,
          accessCodes: ['VALIDCODE']
        }
      }).save();

      const req = mockRequest({
        params: { surveyId: 'test-123' },
        body: {
          answers: [],
          source: { accessCode: 'WRONGCODE' }
        },
        ip: '127.0.0.1'
      });
      const res = mockResponse();

      await surveyController.submitResponse(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid access code'
        })
      );
    });
  });

  describe('saveResponse()', () => {
    it('should save partial response with save token', async () => {
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
          { questionId: 'q2', type: 'text', text: new Map([['en', 'Q2']]) }
        ]
      }).save();

      const req = mockRequest({
        params: { surveyId: 'test-123' },
        body: {
          answers: [
            { questionId: 'q1', value: 'Answer 1' }
          ],
          userId: 'user-456',
          currentQuestionId: 'q2'
        },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Test-Agent')
      });
      const res = mockResponse();

      await surveyController.saveResponse(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            saveToken: expect.any(String),
            responseId: expect.any(String),
            progress: expect.objectContaining({
              percentage: expect.any(Number)
            })
          })
        })
      );
    });

    it('should reject save if survey does not allow save/resume', async () => {
      await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'active',
        settings: {
          allowSaveResume: false
        }
      }).save();

      const req = mockRequest({
        params: { surveyId: 'test-123' },
        body: { answers: [] },
        ip: '127.0.0.1'
      });
      const res = mockResponse();

      await surveyController.saveResponse(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('resumeResponse()', () => {
    it('should resume saved response successfully', async () => {
      const survey = await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123'
      }).save();

      const response = new SurveyResponse({
        responseId: 'resp-123',
        surveyId: 'test-123',
        status: 'in_progress',
        answers: [{ questionId: 'q1', value: 'Answer 1' }]
      });
      const saveToken = response.generateSaveToken();
      await response.save();

      const req = mockRequest({
        params: { saveToken }
      });
      const res = mockResponse();

      await surveyController.resumeResponse(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            response: expect.objectContaining({
              responseId: 'resp-123'
            }),
            survey: expect.objectContaining({
              surveyId: 'test-123'
            })
          })
        })
      );
    });

    it('should return 404 for invalid save token', async () => {
      const req = mockRequest({
        params: { saveToken: 'invalid-token' }
      });
      const res = mockResponse();

      await surveyController.resumeResponse(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('evaluateLogic()', () => {
    it('should evaluate conditional logic for all questions', async () => {
      await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        questions: [
          {
            questionId: 'q1',
            type: 'text',
            text: new Map([['en', 'Q1']]),
            conditionalLogic: { enabled: false }
          },
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
                  }
                }
              ]
            }
          }
        ]
      }).save();

      const req = mockRequest({
        params: { surveyId: 'test-123' },
        body: {
          responses: { q1: 'yes' }
        }
      });
      const res = mockResponse();

      await surveyController.evaluateLogic(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            q1: expect.any(Object),
            q2: expect.any(Object)
          })
        })
      );
    });
  });

  describe('getAnalytics()', () => {
    it('should return survey analytics', async () => {
      const survey = await new Survey({
        surveyId: 'test-123',
        title: new Map([['en', 'Test']]),
        createdBy: 'user-123',
        status: 'active'
      }).save();

      // Create some responses
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

      const req = mockRequest({
        params: { surveyId: 'test-123' }
      });
      const res = mockResponse();

      await surveyController.getAnalytics(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            surveyId: 'test-123',
            totalResponses: 3,
            completedResponses: 2,
            completionRate: expect.any(Number),
            avgCompletionTime: 150, // (120 + 180) / 2
            isActive: true
          })
        })
      );
    });
  });

  describe('listSurveys()', () => {
    beforeEach(async () => {
      // Create test surveys
      await new Survey({
        surveyId: 'survey-1',
        title: new Map([['en', 'Survey 1']]),
        createdBy: 'user-123',
        status: 'active'
      }).save();

      await new Survey({
        surveyId: 'survey-2',
        title: new Map([['en', 'Survey 2']]),
        createdBy: 'user-123',
        status: 'draft'
      }).save();

      await new Survey({
        surveyId: 'survey-3',
        title: new Map([['en', 'Survey 3']]),
        createdBy: 'user-456',
        status: 'active'
      }).save();
    });

    it('should list all surveys with pagination', async () => {
      const req = mockRequest({
        query: {
          page: 1,
          limit: 10
        }
      });
      const res = mockResponse();

      await surveyController.listSurveys(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ surveyId: expect.any(String) })
          ]),
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            total: 3,
            pages: 1
          })
        })
      );
    });

    it('should filter surveys by status', async () => {
      const req = mockRequest({
        query: {
          status: 'active',
          page: 1,
          limit: 10
        }
      });
      const res = mockResponse();

      await surveyController.listSurveys(req, res);

      const call = res.json.mock.calls[0][0];
      expect(call.data).toHaveLength(2);
      expect(call.data.every(s => s.status === 'active')).toBe(true);
    });

    it('should search surveys by title', async () => {
      const req = mockRequest({
        query: {
          search: 'Survey 1',
          page: 1,
          limit: 10
        }
      });
      const res = mockResponse();

      await surveyController.listSurveys(req, res);

      const call = res.json.mock.calls[0][0];
      expect(call.data).toHaveLength(1);
      expect(call.data[0].surveyId).toBe('survey-1');
    });

    it('should sort surveys', async () => {
      const req = mockRequest({
        query: {
          page: 1,
          limit: 10,
          sortBy: 'surveyId',
          sortOrder: 'asc'
        }
      });
      const res = mockResponse();

      await surveyController.listSurveys(req, res);

      const call = res.json.mock.calls[0][0];
      expect(call.data[0].surveyId).toBe('survey-1');
      expect(call.data[2].surveyId).toBe('survey-3');
    });
  });
});
