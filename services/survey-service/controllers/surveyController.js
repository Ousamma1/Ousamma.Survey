const Survey = require('../models/Survey');
const SurveyResponse = require('../models/SurveyResponse');
const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Survey Controller - Advanced Features
 * Handles survey management, distribution, conditional logic, multi-language
 */

class SurveyController {
  /**
   * Create a new survey
   */
  async createSurvey(req, res) {
    try {
      const {
        title,
        description,
        questions,
        sections,
        languages,
        settings,
        projectId,
        groupId
      } = req.body;

      const surveyId = crypto.randomBytes(8).toString('hex');

      const survey = new Survey({
        surveyId,
        title: new Map(Object.entries(title)),
        description: description ? new Map(Object.entries(description)) : undefined,
        questions,
        sections,
        languages,
        settings,
        projectId,
        groupId,
        createdBy: req.user?.id || req.body.createdBy
      });

      await survey.save();

      res.status(201).json({
        success: true,
        data: survey
      });
    } catch (error) {
      console.error('Error creating survey:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get survey by ID or slug
   */
  async getSurvey(req, res) {
    try {
      const { identifier } = req.params;
      const { language = 'en' } = req.query;

      const survey = await Survey.findBySlugOrId(identifier);

      if (!survey) {
        return res.status(404).json({
          success: false,
          error: 'Survey not found'
        });
      }

      // Check if survey is active
      const isActive = survey.isActive();

      res.json({
        success: true,
        data: {
          ...survey.toObject(),
          isActive,
          publicUrl: survey.getPublicUrl(req.protocol + '://' + req.get('host'))
        }
      });
    } catch (error) {
      console.error('Error getting survey:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update survey
   */
  async updateSurvey(req, res) {
    try {
      const { surveyId } = req.params;
      const updates = req.body;

      const survey = await Survey.findOne({ surveyId });

      if (!survey) {
        return res.status(404).json({
          success: false,
          error: 'Survey not found'
        });
      }

      // Update fields
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          survey[key] = updates[key];
        }
      });

      survey.updatedBy = req.user?.id || updates.updatedBy;
      await survey.save();

      res.json({
        success: true,
        data: survey
      });
    } catch (error) {
      console.error('Error updating survey:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete/archive survey
   */
  async deleteSurvey(req, res) {
    try {
      const { surveyId } = req.params;
      const { permanent = false } = req.query;

      const survey = await Survey.findOne({ surveyId });

      if (!survey) {
        return res.status(404).json({
          success: false,
          error: 'Survey not found'
        });
      }

      if (permanent) {
        await survey.deleteOne();
      } else {
        survey.status = 'archived';
        await survey.save();
      }

      res.json({
        success: true,
        message: permanent ? 'Survey deleted permanently' : 'Survey archived'
      });
    } catch (error) {
      console.error('Error deleting survey:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generate unique distribution link
   */
  async generateDistributionLink(req, res) {
    try {
      const { surveyId } = req.params;
      const { label, maxUses, expiresAt } = req.body;

      const survey = await Survey.findOne({ surveyId });

      if (!survey) {
        return res.status(404).json({
          success: false,
          error: 'Survey not found'
        });
      }

      const link = survey.generateUniqueLink({ label, maxUses, expiresAt });
      await survey.save();

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const fullUrl = `${baseUrl}/survey/${surveyId}?link=${link.code}`;

      res.json({
        success: true,
        data: {
          ...link,
          url: fullUrl
        }
      });
    } catch (error) {
      console.error('Error generating distribution link:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generate QR code for survey
   */
  async generateQRCode(req, res) {
    try {
      const { surveyId } = req.params;
      const { linkId, size = 300 } = req.body;

      const survey = await Survey.findOne({ surveyId });

      if (!survey) {
        return res.status(404).json({
          success: false,
          error: 'Survey not found'
        });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      let surveyUrl = survey.getPublicUrl(baseUrl);

      // If linkId provided, use that distribution link
      if (linkId) {
        const link = survey.distribution.uniqueLinks.find(l => l.linkId === linkId);
        if (link) {
          surveyUrl = `${baseUrl}/survey/${surveyId}?link=${link.code}`;
        }
      }

      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(surveyUrl, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Store QR code reference
      const qrCodeId = crypto.randomBytes(6).toString('hex');
      survey.distribution.qrCodes.push({
        qrCodeId,
        imageUrl: qrCodeDataUrl,
        linkId: linkId || null,
        createdAt: new Date()
      });

      await survey.save();

      res.json({
        success: true,
        data: {
          qrCodeId,
          imageUrl: qrCodeDataUrl,
          surveyUrl
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generate embed code
   */
  async generateEmbedCode(req, res) {
    try {
      const { surveyId } = req.params;
      const { width = '100%', height = '600px', theme = 'light' } = req.body;

      const survey = await Survey.findOne({ surveyId });

      if (!survey) {
        return res.status(404).json({
          success: false,
          error: 'Survey not found'
        });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const embedUrl = `${baseUrl}/embed/${surveyId}`;

      const embedCode = `<iframe
  src="${embedUrl}"
  width="${width}"
  height="${height}"
  frameborder="0"
  style="border: none; overflow: hidden;"
  data-survey-id="${surveyId}"
  data-theme="${theme}"
></iframe>`;

      const scriptCode = `<script src="${baseUrl}/embed/survey-embed.js"></script>
<div id="ousamma-survey-${surveyId}" data-survey="${surveyId}" data-theme="${theme}"></div>`;

      survey.distribution.embedCode.enabled = true;
      survey.distribution.embedCode.styles = new Map(Object.entries({
        width,
        height,
        theme
      }));

      await survey.save();

      res.json({
        success: true,
        data: {
          iframeCode: embedCode,
          scriptCode: scriptCode,
          embedUrl
        }
      });
    } catch (error) {
      console.error('Error generating embed code:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Submit survey response
   */
  async submitResponse(req, res) {
    try {
      const { surveyId } = req.params;
      const {
        answers,
        userId,
        userName,
        userEmail,
        source,
        metadata,
        saveToken
      } = req.body;

      const survey = await Survey.findOne({ surveyId });

      if (!survey) {
        return res.status(404).json({
          success: false,
          error: 'Survey not found'
        });
      }

      // Check if survey can accept responses
      const canSubmit = await survey.canSubmitResponse(userId);
      if (!canSubmit.allowed) {
        return res.status(403).json({
          success: false,
          error: canSubmit.reason
        });
      }

      // Check access code if required
      if (source?.accessCode && !survey.validateAccessCode(source.accessCode)) {
        return res.status(403).json({
          success: false,
          error: 'Invalid access code'
        });
      }

      // Find existing response or create new
      let response;
      if (saveToken) {
        response = await SurveyResponse.findBySaveToken(saveToken);
      }

      if (!response) {
        const responseId = crypto.randomBytes(12).toString('hex');
        response = new SurveyResponse({
          responseId,
          surveyId,
          userId,
          userName,
          userEmail,
          source,
          metadata: {
            ...metadata,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
          },
          ipAddress: req.ip
        });
      }

      // Add answers
      for (const answer of answers) {
        response.setAnswer(answer.questionId, answer.value, answer.metadata);
      }

      // Mark as complete
      response.complete();

      // Validate
      const isValid = await response.validate(survey);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          errors: response.validationErrors
        });
      }

      await response.save();

      // Update survey stats
      survey.incrementResponseCount(true);
      await survey.save();

      // Track link usage
      if (source?.linkId) {
        const link = survey.distribution.uniqueLinks.find(l => l.linkId === source.linkId);
        if (link) {
          link.usedCount += 1;
          await survey.save();
        }
      }

      res.json({
        success: true,
        data: {
          responseId: response.responseId,
          thankYouMessage: survey.settings.thankYouPage.message,
          redirectUrl: survey.settings.thankYouPage.redirectUrl,
          redirectDelay: survey.settings.thankYouPage.redirectDelay
        }
      });
    } catch (error) {
      console.error('Error submitting response:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Save response (partial) for resume later
   */
  async saveResponse(req, res) {
    try {
      const { surveyId } = req.params;
      const {
        answers,
        userId,
        currentSectionId,
        currentQuestionId,
        saveToken
      } = req.body;

      const survey = await Survey.findOne({ surveyId });

      if (!survey) {
        return res.status(404).json({
          success: false,
          error: 'Survey not found'
        });
      }

      if (!survey.settings.allowSaveResume) {
        return res.status(403).json({
          success: false,
          error: 'Save and resume is not enabled for this survey'
        });
      }

      // Find existing or create new
      let response;
      if (saveToken) {
        response = await SurveyResponse.findBySaveToken(saveToken);
      }

      if (!response) {
        const responseId = crypto.randomBytes(12).toString('hex');
        response = new SurveyResponse({
          responseId,
          surveyId,
          userId,
          ipAddress: req.ip,
          metadata: {
            userAgent: req.get('user-agent')
          }
        });
      }

      // Update answers
      for (const answer of answers) {
        response.setAnswer(answer.questionId, answer.value, answer.metadata);
      }

      // Update progress
      response.progress.currentSectionId = currentSectionId;
      response.progress.currentQuestionId = currentQuestionId;
      response.updateProgress(survey.questions.length);

      // Generate save token if not exists
      if (!response.saveToken) {
        response.generateSaveToken();
      }

      response.resumeCount += 1;
      await response.save();

      res.json({
        success: true,
        data: {
          saveToken: response.saveToken,
          responseId: response.responseId,
          progress: response.progress
        }
      });
    } catch (error) {
      console.error('Error saving response:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Resume saved response
   */
  async resumeResponse(req, res) {
    try {
      const { saveToken } = req.params;

      const response = await SurveyResponse.findBySaveToken(saveToken);

      if (!response) {
        return res.status(404).json({
          success: false,
          error: 'Saved response not found or expired'
        });
      }

      const survey = await Survey.findOne({ surveyId: response.surveyId });

      if (!survey) {
        return res.status(404).json({
          success: false,
          error: 'Survey not found'
        });
      }

      res.json({
        success: true,
        data: {
          response: response.toObject(),
          survey: survey.toObject()
        }
      });
    } catch (error) {
      console.error('Error resuming response:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Evaluate conditional logic for current state
   */
  async evaluateLogic(req, res) {
    try {
      const { surveyId } = req.params;
      const { responses } = req.body;

      const survey = await Survey.findOne({ surveyId });

      if (!survey) {
        return res.status(404).json({
          success: false,
          error: 'Survey not found'
        });
      }

      const evaluations = {};

      for (const question of survey.questions) {
        const result = survey.evaluateConditionalLogic(question.questionId, responses);
        evaluations[question.questionId] = result;
      }

      res.json({
        success: true,
        data: evaluations
      });
    } catch (error) {
      console.error('Error evaluating logic:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get question with piping applied
   */
  async getQuestionWithPiping(req, res) {
    try {
      const { surveyId, questionId } = req.params;
      const { responses, language = 'en' } = req.body;

      const survey = await Survey.findOne({ surveyId });

      if (!survey) {
        return res.status(404).json({
          success: false,
          error: 'Survey not found'
        });
      }

      const question = survey.questions.find(q => q.questionId === questionId);

      if (!question) {
        return res.status(404).json({
          success: false,
          error: 'Question not found'
        });
      }

      const text = survey.applyPiping(questionId, responses, language);

      res.json({
        success: true,
        data: {
          questionId,
          originalText: question.text.get(language),
          pipedText: text
        }
      });
    } catch (error) {
      console.error('Error getting question with piping:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get survey analytics
   */
  async getAnalytics(req, res) {
    try {
      const { surveyId } = req.params;

      const survey = await Survey.findOne({ surveyId });

      if (!survey) {
        return res.status(404).json({
          success: false,
          error: 'Survey not found'
        });
      }

      const totalResponses = await SurveyResponse.countDocuments({ surveyId });
      const completedResponses = await SurveyResponse.countDocuments({
        surveyId,
        isComplete: true
      });
      const completionRate = await SurveyResponse.getCompletionRate(surveyId);
      const avgCompletionTime = await SurveyResponse.getAverageCompletionTime(surveyId);

      // Distribution link stats
      const distributionStats = survey.distribution.uniqueLinks.map(link => ({
        linkId: link.linkId,
        label: link.label,
        usedCount: link.usedCount,
        maxUses: link.maxUses,
        utilization: link.maxUses ? (link.usedCount / link.maxUses) * 100 : null
      }));

      res.json({
        success: true,
        data: {
          surveyId,
          totalResponses,
          completedResponses,
          completionRate,
          avgCompletionTime,
          distributionStats,
          status: survey.status,
          isActive: survey.isActive()
        }
      });
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * List all surveys
   */
  async listSurveys(req, res) {
    try {
      const {
        projectId,
        status,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filter = {};

      if (projectId) filter.projectId = projectId;
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { 'title.en': { $regex: search, $options: 'i' } },
          { 'title.ar': { $regex: search, $options: 'i' } },
          { surveyId: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const surveys = await Survey.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Survey.countDocuments(filter);

      res.json({
        success: true,
        data: surveys,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error listing surveys:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new SurveyController();
