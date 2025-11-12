const { Parser } = require('json2csv');

/**
 * Export Service
 * Handles exporting analytics data to various formats
 */
class ExportService {
  /**
   * Export survey analytics to CSV
   */
  static async exportToCSV(data, fields = null) {
    try {
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(data);
      return csv;
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  }

  /**
   * Export survey analytics to JSON
   */
  static async exportToJSON(data) {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      throw error;
    }
  }

  /**
   * Prepare survey analytics for export
   */
  static prepareSurveyExport(analytics) {
    return {
      surveyId: analytics.surveyId,
      totalResponses: analytics.totalResponses,
      completionRate: `${analytics.completionRate.toFixed(2)}%`,
      averageTime: `${Math.floor(analytics.averageTime / 60)}m ${analytics.averageTime % 60}s`,
      lastUpdated: analytics.lastUpdated.toISOString(),
      deviceDistribution: analytics.deviceDistribution,
      locationDistribution: analytics.locationDistribution
    };
  }

  /**
   * Prepare question analytics for export
   */
  static prepareQuestionExport(questionAnalytics) {
    return questionAnalytics.map(qa => ({
      questionId: qa.questionId,
      surveyId: qa.surveyId,
      questionType: qa.questionType,
      responseCount: qa.responseCount,
      mean: qa.statistics.mean?.toFixed(2) || 'N/A',
      median: qa.statistics.median?.toFixed(2) || 'N/A',
      mode: qa.statistics.mode || 'N/A',
      stdDev: qa.statistics.stdDev?.toFixed(2) || 'N/A',
      min: qa.statistics.min || 'N/A',
      max: qa.statistics.max || 'N/A'
    }));
  }

  /**
   * Export detailed analytics report
   */
  static async exportDetailedReport(surveyAnalytics, questionAnalytics, format = 'json') {
    const report = {
      survey: this.prepareSurveyExport(surveyAnalytics),
      questions: this.prepareQuestionExport(questionAnalytics),
      generatedAt: new Date().toISOString()
    };

    if (format === 'csv') {
      // For CSV, we'll create separate sections
      const surveyCSV = await this.exportToCSV([report.survey]);
      const questionsCSV = await this.exportToCSV(report.questions);
      return `Survey Analytics\n${surveyCSV}\n\nQuestion Analytics\n${questionsCSV}`;
    }

    return await this.exportToJSON(report);
  }

  /**
   * Format data for download
   */
  static formatForDownload(data, format, filename) {
    const timestamp = new Date().toISOString().split('T')[0];
    return {
      data,
      filename: `${filename}_${timestamp}.${format}`,
      contentType: format === 'csv' ? 'text/csv' : 'application/json'
    };
  }
}

module.exports = ExportService;
