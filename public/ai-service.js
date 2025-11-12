// AI Service Client
// Handles all AI API interactions

class AIService {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.provider = 'openai';
    this.context = {};
    this.messageHistory = [];
  }

  setProvider(provider) {
    this.provider = provider;
  }

  setContext(context) {
    this.context = { ...this.context, ...context };
  }

  clearContext() {
    this.context = {};
  }

  addMessage(role, content) {
    this.messageHistory.push({ role, content, timestamp: new Date().toISOString() });
  }

  clearHistory() {
    this.messageHistory = [];
  }

  async chat(message, options = {}) {
    this.addMessage('user', message);

    try {
      const response = await fetch(`${this.baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: this.messageHistory,
          context: this.context,
          provider: options.provider || this.provider,
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`AI chat failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.addMessage('assistant', data.message || data.response);
      return data;
    } catch (error) {
      console.error('AI chat error:', error);
      throw error;
    }
  }

  async generateSurvey(description, requirements = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/generate-survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          requirements,
          context: this.context
        })
      });

      if (!response.ok) {
        throw new Error(`Survey generation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Survey generation error:', error);
      throw error;
    }
  }

  async optimizeSurvey(survey, goals = []) {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/optimize-survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey,
          optimizationGoals: goals,
          context: this.context
        })
      });

      if (!response.ok) {
        throw new Error(`Survey optimization failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Survey optimization error:', error);
      throw error;
    }
  }

  async analyzeResponses(responses, query = '', analysisType = 'general') {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/analyze-responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses,
          query,
          analysisType
        })
      });

      if (!response.ok) {
        throw new Error(`Response analysis failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Response analysis error:', error);
      throw error;
    }
  }

  async queryData(query, data) {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/query-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          data,
          context: this.context
        })
      });

      if (!response.ok) {
        throw new Error(`Data query failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Data query error:', error);
      throw error;
    }
  }

  async identifyTrends(responses, timeframe = 'all', categories = []) {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/identify-trends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses,
          timeframe,
          categories
        })
      });

      if (!response.ok) {
        throw new Error(`Trend identification failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Trend identification error:', error);
      throw error;
    }
  }

  async detectAnomalies(responses, threshold = 0.05) {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/detect-anomalies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses,
          threshold
        })
      });

      if (!response.ok) {
        throw new Error(`Anomaly detection failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Anomaly detection error:', error);
      throw error;
    }
  }

  async generateReport(responses, reportType = 'comprehensive', format = 'markdown', sections = []) {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses,
          reportType,
          format,
          sections: sections.length > 0 ? sections : ['summary', 'insights', 'recommendations']
        })
      });

      if (!response.ok) {
        throw new Error(`Report generation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Report generation error:', error);
      throw error;
    }
  }

  async getABTestSuggestions(survey, metric = 'completion_rate') {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/ab-test-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey,
          metric
        })
      });

      if (!response.ok) {
        throw new Error(`A/B test suggestions failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('A/B test suggestions error:', error);
      throw error;
    }
  }

  async enhanceText(text) {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`Text enhancement failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.enhanced || data.text || text;
    } catch (error) {
      console.error('Text enhancement error:', error);
      return text;
    }
  }

  async uploadContextFile(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/api/context/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`File upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  async getContextFiles() {
    try {
      const response = await fetch(`${this.baseUrl}/api/context/files`);

      if (!response.ok) {
        throw new Error(`Failed to get context files: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get context files error:', error);
      return { files: [] };
    }
  }

  async deleteContextFile(filename) {
    try {
      const response = await fetch(`${this.baseUrl}/api/context/files/${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete context file: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Delete context file error:', error);
      throw error;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIService;
}
