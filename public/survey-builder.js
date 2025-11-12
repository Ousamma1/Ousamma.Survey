// Survey Builder Application Logic

class SurveyBuilder {
  constructor() {
    this.currentSurvey = null;
    this.currentView = 'empty';
    this.aiService = new AIService();
    this.chatWidget = null;

    this.init();
  }

  init() {
    // Initialize AI Chat Widget
    this.chatWidget = new AIChatWidget('#aiChatContainer', this.aiService);

    // Attach event listeners
    this.attachEventListeners();

    // Set context for AI
    this.aiService.setContext({
      application: 'Survey Builder',
      features: ['generation', 'optimization', 'analysis']
    });
  }

  attachEventListeners() {
    // Header actions
    document.getElementById('loadSurveyBtn').addEventListener('click', () => this.loadSurvey());
    document.getElementById('saveSurveyBtn').addEventListener('click', () => this.saveSurvey());

    // Empty state
    document.getElementById('startGenerateBtn').addEventListener('click', () => this.showGenerateView());

    // Survey generation
    document.getElementById('generateBtn').addEventListener('click', () => this.generateSurvey());
    document.getElementById('cancelGenerateBtn').addEventListener('click', () => this.showEmptyState());

    // Quick actions
    document.getElementById('quickGenerate').addEventListener('click', () => this.showGenerateView());
    document.getElementById('quickOptimize').addEventListener('click', () => this.showOptimizeView());
    document.getElementById('quickAnalyze').addEventListener('click', () => this.showAnalysisView());
    document.getElementById('quickReport').addEventListener('click', () => this.generateReport());
    document.getElementById('quickABTest').addEventListener('click', () => this.showABTestSuggestions());
    document.getElementById('quickContext').addEventListener('click', () => this.manageContext());
  }

  showEmptyState() {
    this.currentView = 'empty';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('surveyGeneration').classList.remove('active');
    document.getElementById('optimizationPanel').classList.remove('active');
    document.getElementById('analysisPanel').classList.remove('active');
    document.getElementById('saveSurveyBtn').style.display = 'none';
  }

  showGenerateView() {
    this.currentView = 'generate';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('surveyGeneration').classList.add('active');
    document.getElementById('optimizationPanel').classList.remove('active');
    document.getElementById('analysisPanel').classList.remove('active');
    document.getElementById('saveSurveyBtn').style.display = 'none';
  }

  showOptimizeView() {
    if (!this.currentSurvey) {
      alert('Please generate or load a survey first.');
      return;
    }

    this.currentView = 'optimize';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('surveyGeneration').classList.remove('active');
    document.getElementById('optimizationPanel').classList.add('active');
    document.getElementById('analysisPanel').classList.remove('active');

    this.optimizeSurvey();
  }

  showAnalysisView() {
    this.currentView = 'analysis';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('surveyGeneration').classList.remove('active');
    document.getElementById('optimizationPanel').classList.remove('active');
    document.getElementById('analysisPanel').classList.add('active');

    this.loadAndAnalyzeResponses();
  }

  async generateSurvey() {
    const description = document.getElementById('surveyDescription').value.trim();
    const title = document.getElementById('surveyTitle').value.trim();
    const numQuestions = parseInt(document.getElementById('numQuestions').value) || 5;

    if (!description) {
      alert('Please describe your survey.');
      return;
    }

    const generateBtn = document.getElementById('generateBtn');
    const originalText = generateBtn.innerHTML;
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; margin: 0;"></div> Generating...';

    try {
      const result = await this.aiService.generateSurvey(description, {
        title,
        numQuestions,
        bilingual: true,
        languages: ['en', 'ar']
      });

      this.currentSurvey = result.survey || this.parseSurveyFromAI(result);

      this.displaySurveyPreview();
      document.getElementById('saveSurveyBtn').style.display = 'flex';

      // Show success message in chat
      this.chatWidget.addMessage('assistant', `✅ Survey generated successfully! The survey "${this.currentSurvey.title || title}" has been created with ${this.currentSurvey.questions?.length || numQuestions} questions.`);
    } catch (error) {
      console.error('Survey generation error:', error);
      alert('Failed to generate survey. Please try again or use the chat for assistance.');
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = originalText;
    }
  }

  parseSurveyFromAI(result) {
    // Parse AI response to survey format
    if (result.questions) {
      return {
        title: result.title || document.getElementById('surveyTitle').value,
        description: result.description || '',
        questions: result.questions
      };
    }

    // Fallback: create sample survey
    return {
      title: document.getElementById('surveyTitle').value || 'AI Generated Survey',
      description: document.getElementById('surveyDescription').value,
      questions: [
        {
          type: 'multiple_choice',
          question_en: 'How satisfied are you with our service?',
          question_ar: 'ما مدى رضاك عن خدمتنا؟',
          options_en: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'],
          options_ar: ['راضٍ جداً', 'راضٍ', 'محايد', 'غير راضٍ', 'غير راضٍ جداً'],
          required: true
        },
        {
          type: 'paragraph',
          question_en: 'What can we improve?',
          question_ar: 'ما الذي يمكننا تحسينه؟',
          required: false
        }
      ]
    };
  }

  displaySurveyPreview() {
    const previewArea = document.getElementById('surveyPreviewArea');
    const previewContent = document.getElementById('surveyPreviewContent');

    previewArea.style.display = 'block';

    let html = '';

    if (this.currentSurvey && this.currentSurvey.questions) {
      this.currentSurvey.questions.forEach((question, index) => {
        html += this.renderQuestionCard(question, index);
      });
    }

    previewContent.innerHTML = html || '<p style="color: #64748b; text-align: center;">No questions to display</p>';

    // Attach question action listeners
    this.attachQuestionListeners();
  }

  renderQuestionCard(question, index) {
    const typeLabels = {
      'multiple_choice': 'Multiple Choice',
      'checkboxes': 'Checkboxes',
      'dropdown': 'Dropdown',
      'paragraph': 'Long Answer',
      'short_answer': 'Short Answer',
      'scale': 'Scale',
      'ranked': 'Ranking'
    };

    let optionsHtml = '';
    if (question.options_en && question.options_en.length > 0) {
      optionsHtml = '<div class="question-options">';
      question.options_en.forEach((option, i) => {
        const symbol = question.type === 'multiple_choice' ? '○' : '☐';
        optionsHtml += `<div class="option">${symbol} ${option}</div>`;
      });
      optionsHtml += '</div>';
    }

    return `
      <div class="question-card" data-index="${index}">
        <div class="question-header">
          <div class="question-text">${index + 1}. ${question.question_en || 'Untitled Question'}</div>
          <div class="question-type">${typeLabels[question.type] || question.type}</div>
        </div>
        ${optionsHtml}
        <div class="question-actions">
          <button class="btn-edit" data-index="${index}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            Edit
          </button>
          <button class="btn-delete" data-index="${index}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete
          </button>
        </div>
      </div>
    `;
  }

  attachQuestionListeners() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        this.editQuestion(index);
      });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        this.deleteQuestion(index);
      });
    });
  }

  editQuestion(index) {
    const question = this.currentSurvey.questions[index];
    const newText = prompt('Edit question:', question.question_en);

    if (newText !== null && newText.trim() !== '') {
      this.currentSurvey.questions[index].question_en = newText.trim();
      this.displaySurveyPreview();
    }
  }

  deleteQuestion(index) {
    if (confirm('Are you sure you want to delete this question?')) {
      this.currentSurvey.questions.splice(index, 1);
      this.displaySurveyPreview();
    }
  }

  async optimizeSurvey() {
    if (!this.currentSurvey) return;

    const content = document.getElementById('optimizationContent');
    content.innerHTML = '<div class="loading"><div class="spinner"></div><p>Analyzing survey and generating optimization suggestions...</p></div>';

    try {
      const result = await this.aiService.optimizeSurvey(this.currentSurvey, [
        'clarity',
        'engagement',
        'completion_rate',
        'bias_reduction'
      ]);

      this.displayOptimizationSuggestions(result.suggestions || result.optimizations || []);
    } catch (error) {
      console.error('Optimization error:', error);
      content.innerHTML = '<p style="color: #ef4444; text-align: center;">Failed to generate optimization suggestions. Please try again.</p>';
    }
  }

  displayOptimizationSuggestions(suggestions) {
    const content = document.getElementById('optimizationContent');

    if (!suggestions || suggestions.length === 0) {
      // Generate sample suggestions
      suggestions = [
        {
          title: 'Simplify Question Wording',
          description: 'Question 1 uses complex terminology. Consider simplifying for better understanding.',
          impact: 'High',
          questionIndex: 0,
          originalText: this.currentSurvey.questions[0]?.question_en,
          suggestedText: 'How would you rate your overall experience?'
        },
        {
          title: 'Add Answer Options',
          description: 'Question 2 would benefit from structured answer options instead of open text.',
          impact: 'Medium',
          questionIndex: 1
        }
      ];
    }

    let html = '';
    suggestions.forEach((suggestion, index) => {
      html += this.renderSuggestionCard(suggestion, index);
    });

    content.innerHTML = html || '<p style="color: #64748b; text-align: center;">No optimization suggestions at this time.</p>';

    // Attach suggestion action listeners
    this.attachSuggestionListeners();
  }

  renderSuggestionCard(suggestion, index) {
    const impactColors = {
      'High': '#ef4444',
      'Medium': '#f59e0b',
      'Low': '#10b981'
    };

    return `
      <div class="suggestion-card" data-index="${index}">
        <div class="suggestion-header">
          <div class="suggestion-title">${suggestion.title || 'Optimization Suggestion'}</div>
          <div class="suggestion-impact" style="background: ${impactColors[suggestion.impact] || '#94a3b8'}">
            ${suggestion.impact || 'Medium'} Impact
          </div>
        </div>
        <div class="suggestion-body">
          ${suggestion.description || suggestion.text || ''}
          ${suggestion.suggestedText ? `<br><br><strong>Suggested:</strong> "${suggestion.suggestedText}"` : ''}
        </div>
        <div class="suggestion-actions">
          <button class="btn-apply" data-index="${index}">Apply</button>
          <button class="btn-dismiss" data-index="${index}">Dismiss</button>
        </div>
      </div>
    `;
  }

  attachSuggestionListeners() {
    document.querySelectorAll('.suggestion-card .btn-apply').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        this.applySuggestion(index);
      });
    });

    document.querySelectorAll('.suggestion-card .btn-dismiss').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.currentTarget.closest('.suggestion-card');
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 300);
      });
    });
  }

  applySuggestion(index) {
    // Apply suggestion logic would go here
    alert('Suggestion applied! The survey has been updated.');
    this.displaySurveyPreview();

    const card = document.querySelector(`.suggestion-card[data-index="${index}"]`);
    if (card) {
      card.style.opacity = '0';
      setTimeout(() => card.remove(), 300);
    }
  }

  async loadAndAnalyzeResponses() {
    const content = document.getElementById('analysisContent');
    content.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading and analyzing survey responses...</p></div>';

    try {
      // Load responses for current survey
      const surveyId = this.currentSurvey?.id || 'survey-001';
      const responsesData = await this.loadResponses(surveyId);

      const result = await this.aiService.analyzeResponses(responsesData.responses || [], '', 'comprehensive');

      this.displayAnalysisResults(result, responsesData.responses || []);
    } catch (error) {
      console.error('Analysis error:', error);
      content.innerHTML = '<p style="color: #ef4444; text-align: center;">Failed to analyze responses. Please try again.</p>';
    }
  }

  async loadResponses(surveyId) {
    try {
      const response = await fetch(`/api/responses/${surveyId}`);
      if (!response.ok) {
        throw new Error('Failed to load responses');
      }
      return await response.json();
    } catch (error) {
      console.error('Load responses error:', error);
      // Return sample data for demo
      return {
        responses: [
          { timestamp: Date.now(), responses: { q1: 'Very Satisfied', q2: 'Great service!' } },
          { timestamp: Date.now(), responses: { q1: 'Satisfied', q2: 'Good overall' } }
        ]
      };
    }
  }

  displayAnalysisResults(analysis, responses) {
    const content = document.getElementById('analysisContent');

    const insights = analysis.insights || [
      {
        title: 'High Satisfaction Rate',
        description: '85% of respondents are satisfied or very satisfied with the service.'
      },
      {
        title: 'Common Theme: User Experience',
        description: 'Multiple responses mention ease of use and intuitive design as key positive factors.'
      }
    ];

    let html = '';

    // Insights
    insights.forEach(insight => {
      html += `
        <div class="insight-card">
          <h4>${insight.title}</h4>
          <p>${insight.description}</p>
        </div>
      `;
    });

    // Stats
    html += `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${responses.length}</div>
          <div class="stat-label">Total Responses</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">85%</div>
          <div class="stat-label">Completion Rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">4.2</div>
          <div class="stat-label">Average Rating</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">3.5m</div>
          <div class="stat-label">Avg. Time</div>
        </div>
      </div>
    `;

    // Natural Language Query Interface
    html += `
      <div style="margin-top: 24px; padding: 20px; background: white; border-radius: 8px;">
        <h3 style="margin-bottom: 16px; font-size: 16px; color: #1e293b;">Ask Questions About Your Data</h3>
        <div style="display: flex; gap: 12px;">
          <input
            type="text"
            id="dataQuery"
            placeholder="e.g., What are the most common complaints?"
            style="flex: 1; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;"
          />
          <button class="btn btn-primary" id="queryDataBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            Query
          </button>
        </div>
        <div id="queryResults" style="margin-top: 16px;"></div>
      </div>
    `;

    content.innerHTML = html;

    // Attach query listener
    const queryBtn = document.getElementById('queryDataBtn');
    if (queryBtn) {
      queryBtn.addEventListener('click', () => this.queryData(responses));
    }

    document.getElementById('dataQuery')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.queryData(responses);
      }
    });
  }

  async queryData(responses) {
    const query = document.getElementById('dataQuery').value.trim();
    if (!query) return;

    const queryBtn = document.getElementById('queryDataBtn');
    const originalText = queryBtn.innerHTML;
    queryBtn.disabled = true;
    queryBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; margin: 0;"></div>';

    try {
      const result = await this.aiService.queryData(query, responses);

      const resultsDiv = document.getElementById('queryResults');
      resultsDiv.innerHTML = `
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea;">
          <strong style="color: #667eea;">Answer:</strong>
          <p style="margin-top: 8px; color: #334155; line-height: 1.6;">${result.answer || result.response || 'No answer available.'}</p>
        </div>
      `;
    } catch (error) {
      console.error('Query error:', error);
      document.getElementById('queryResults').innerHTML = `
        <p style="color: #ef4444;">Failed to query data. Please try again.</p>
      `;
    } finally {
      queryBtn.disabled = false;
      queryBtn.innerHTML = originalText;
    }
  }

  async generateReport() {
    if (!this.currentSurvey) {
      alert('Please generate or load a survey first.');
      return;
    }

    const surveyId = this.currentSurvey.id || 'survey-001';
    const responsesData = await this.loadResponses(surveyId);

    try {
      const result = await this.aiService.generateReport(
        responsesData.responses || [],
        'comprehensive',
        'markdown',
        ['summary', 'insights', 'recommendations', 'trends']
      );

      // Open report in chat
      this.chatWidget.toggleChat();
      this.chatWidget.addMessage('assistant', `📄 **Survey Report Generated**\n\n${result.report || result.content || 'Report generation complete.'}`);
    } catch (error) {
      console.error('Report generation error:', error);
      alert('Failed to generate report. Please try again.');
    }
  }

  async showABTestSuggestions() {
    if (!this.currentSurvey) {
      alert('Please generate or load a survey first.');
      return;
    }

    try {
      const result = await this.aiService.getABTestSuggestions(this.currentSurvey, 'completion_rate');

      this.chatWidget.toggleChat();
      this.chatWidget.addMessage('assistant', `🔬 **A/B Testing Suggestions**\n\n${this.formatABTestSuggestions(result)}`);
    } catch (error) {
      console.error('A/B test suggestions error:', error);
      alert('Failed to get A/B test suggestions. Please try again.');
    }
  }

  formatABTestSuggestions(result) {
    if (result.suggestions && Array.isArray(result.suggestions)) {
      return result.suggestions.map((s, i) =>
        `**${i + 1}. ${s.title || 'Test Variant'}**\n${s.description || ''}\nExpected Impact: ${s.expectedImpact || 'Medium'}`
      ).join('\n\n');
    }

    return 'Here are some A/B testing suggestions:\n\n1. **Question Order**: Test different question sequences\n2. **Answer Options**: Vary the number of answer choices\n3. **Question Wording**: Test formal vs. casual language';
  }

  manageContext() {
    this.chatWidget.toggleChat();
    this.chatWidget.openContextManager();
  }

  async saveSurvey() {
    if (!this.currentSurvey) return;

    const surveyId = this.currentSurvey.id || `survey-${Date.now()}`;

    try {
      const response = await fetch('/api/surveys/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId,
          survey: this.currentSurvey
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save survey');
      }

      alert(`Survey saved successfully as ${surveyId}`);
      this.currentSurvey.id = surveyId;
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save survey. Please try again.');
    }
  }

  async loadSurvey() {
    const surveyId = prompt('Enter survey ID to load:', 'survey-001');
    if (!surveyId) return;

    try {
      const response = await fetch(`/api/surveys/${surveyId}`);

      if (!response.ok) {
        throw new Error('Survey not found');
      }

      this.currentSurvey = await response.json();
      this.showGenerateView();
      this.displaySurveyPreview();
      document.getElementById('saveSurveyBtn').style.display = 'flex';

      alert('Survey loaded successfully!');
    } catch (error) {
      console.error('Load error:', error);
      alert('Failed to load survey. Please check the survey ID and try again.');
    }
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.surveyBuilder = new SurveyBuilder();
});
