/**
 * Analytics Service
 * Handles data fetching, processing, and calculations for analytics dashboard
 */
class AnalyticsService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get single survey analytics
     */
    async getSurveyAnalytics(surveyId) {
        try {
            const [survey, responses, locations] = await Promise.all([
                this.getSurvey(surveyId),
                this.getResponses(surveyId),
                this.getResponseLocations(surveyId)
            ]);

            return {
                survey,
                responses,
                locations,
                metrics: this.calculateMetrics(survey, responses),
                timeline: this.generateTimeline(responses),
                questionBreakdown: this.analyzeQuestions(survey, responses),
                demographics: this.analyzeDemographics(responses),
                dropoff: this.analyzeDropoff(responses),
                locationData: this.processLocationData(locations)
            };
        } catch (error) {
            console.error('Error fetching survey analytics:', error);
            throw error;
        }
    }

    /**
     * Get survey comparison analytics
     */
    async getComparisonAnalytics(surveyIds) {
        try {
            const analyticsData = await Promise.all(
                surveyIds.map(id => this.getSurveyAnalytics(id))
            );

            return {
                surveys: analyticsData,
                comparison: this.compareSurveys(analyticsData),
                trends: this.identifyTrends(analyticsData),
                aggregated: this.aggregateMetrics(analyticsData)
            };
        } catch (error) {
            console.error('Error fetching comparison analytics:', error);
            throw error;
        }
    }

    /**
     * Fetch survey data
     */
    async getSurvey(surveyId) {
        const cached = this.getFromCache(`survey_${surveyId}`);
        if (cached) return cached;

        const response = await fetch(`/api/surveys/${surveyId}`);
        if (!response.ok) throw new Error('Failed to fetch survey');

        const data = await response.json();
        this.setCache(`survey_${surveyId}`, data);
        return data;
    }

    /**
     * Fetch survey responses
     */
    async getResponses(surveyId) {
        const cached = this.getFromCache(`responses_${surveyId}`);
        if (cached) return cached;

        const response = await fetch(`/api/responses/${surveyId}`);
        if (!response.ok) throw new Error('Failed to fetch responses');

        const data = await response.json();
        this.setCache(`responses_${surveyId}`, data);
        return data;
    }

    /**
     * Fetch response locations
     */
    async getResponseLocations(surveyId) {
        try {
            const response = await fetch(`/api/geo/nearby?entityId=${surveyId}&type=response&radius=999999`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.warn('Failed to fetch locations:', error);
            return [];
        }
    }

    /**
     * Calculate overview metrics
     */
    calculateMetrics(survey, responses) {
        const totalResponses = responses.length;
        const completeResponses = responses.filter(r => r.completed).length;
        const completionRate = totalResponses > 0 ? (completeResponses / totalResponses) * 100 : 0;

        // Calculate average completion time
        const completionTimes = responses
            .filter(r => r.startTime && r.endTime)
            .map(r => new Date(r.endTime) - new Date(r.startTime));

        const avgTime = completionTimes.length > 0
            ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
            : 0;

        // Calculate response rate over time
        const now = new Date();
        const last24h = responses.filter(r => {
            const responseTime = new Date(r.timestamp || r.createdAt);
            return (now - responseTime) < 24 * 60 * 60 * 1000;
        }).length;

        const last7d = responses.filter(r => {
            const responseTime = new Date(r.timestamp || r.createdAt);
            return (now - responseTime) < 7 * 24 * 60 * 60 * 1000;
        }).length;

        return {
            totalResponses,
            completeResponses,
            incompleteResponses: totalResponses - completeResponses,
            completionRate: completionRate.toFixed(1),
            averageTime: this.formatDuration(avgTime),
            averageTimeMs: avgTime,
            responsesLast24h: last24h,
            responsesLast7d: last7d,
            questions: survey.questions?.length || 0
        };
    }

    /**
     * Generate response timeline data
     */
    generateTimeline(responses, interval = 'day') {
        const timeline = {};

        responses.forEach(response => {
            const date = new Date(response.timestamp || response.createdAt);
            let key;

            switch (interval) {
                case 'hour':
                    key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:00`;
                    break;
                case 'day':
                    key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
                    break;
                case 'week':
                    const weekNum = this.getWeekNumber(date);
                    key = `${date.getFullYear()}-W${weekNum}`;
                    break;
                case 'month':
                    key = `${date.getFullYear()}-${date.getMonth() + 1}`;
                    break;
                default:
                    key = date.toISOString().split('T')[0];
            }

            timeline[key] = (timeline[key] || 0) + 1;
        });

        return Object.entries(timeline)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }));
    }

    /**
     * Analyze question responses
     */
    analyzeQuestions(survey, responses) {
        if (!survey.questions || !Array.isArray(survey.questions)) {
            return [];
        }

        return survey.questions.map((question, index) => {
            const questionResponses = responses
                .map(r => r.answers?.[index] || r.answers?.[question.id])
                .filter(answer => answer !== undefined && answer !== null && answer !== '');

            const analysis = {
                question: question.text || question.question,
                type: question.type,
                totalResponses: questionResponses.length,
                responseRate: responses.length > 0
                    ? ((questionResponses.length / responses.length) * 100).toFixed(1)
                    : 0
            };

            // Type-specific analysis
            switch (question.type) {
                case 'multiple-choice':
                case 'radio':
                case 'dropdown':
                    analysis.distribution = this.calculateDistribution(
                        questionResponses,
                        question.options
                    );
                    analysis.mostCommon = this.findMostCommon(questionResponses);
                    break;

                case 'checkbox':
                    analysis.distribution = this.calculateCheckboxDistribution(
                        questionResponses,
                        question.options
                    );
                    break;

                case 'rating':
                case 'scale':
                    analysis.average = this.calculateAverage(questionResponses);
                    analysis.distribution = this.calculateDistribution(questionResponses);
                    break;

                case 'text':
                case 'textarea':
                    analysis.wordCloud = this.generateWordFrequency(questionResponses);
                    analysis.avgLength = this.calculateAverageLength(questionResponses);
                    break;

                case 'number':
                    analysis.average = this.calculateAverage(questionResponses);
                    analysis.min = Math.min(...questionResponses.map(Number));
                    analysis.max = Math.max(...questionResponses.map(Number));
                    analysis.median = this.calculateMedian(questionResponses.map(Number));
                    break;
            }

            return analysis;
        });
    }

    /**
     * Analyze demographics
     */
    analyzeDemographics(responses) {
        const demographics = {
            age: {},
            gender: {},
            location: {},
            device: {},
            language: {}
        };

        responses.forEach(response => {
            // Age groups
            if (response.demographics?.age) {
                const ageGroup = this.getAgeGroup(response.demographics.age);
                demographics.age[ageGroup] = (demographics.age[ageGroup] || 0) + 1;
            }

            // Gender
            if (response.demographics?.gender) {
                demographics.gender[response.demographics.gender] =
                    (demographics.gender[response.demographics.gender] || 0) + 1;
            }

            // Location
            if (response.location?.city) {
                demographics.location[response.location.city] =
                    (demographics.location[response.location.city] || 0) + 1;
            }

            // Device type
            if (response.device?.type) {
                demographics.device[response.device.type] =
                    (demographics.device[response.device.type] || 0) + 1;
            }

            // Language
            if (response.language) {
                demographics.language[response.language] =
                    (demographics.language[response.language] || 0) + 1;
            }
        });

        return demographics;
    }

    /**
     * Analyze drop-off points
     */
    analyzeDropoff(responses) {
        const questionDropoff = {};

        responses.forEach(response => {
            if (!response.completed && response.answers) {
                const lastAnswered = Object.keys(response.answers).length;
                questionDropoff[lastAnswered] = (questionDropoff[lastAnswered] || 0) + 1;
            }
        });

        return {
            dropoffPoints: questionDropoff,
            completionFunnel: this.calculateCompletionFunnel(responses)
        };
    }

    /**
     * Calculate completion funnel
     */
    calculateCompletionFunnel(responses) {
        const funnel = [];
        const totalStarted = responses.length;

        // Group by questions answered
        const questionCounts = {};
        responses.forEach(response => {
            const answeredCount = response.answers ? Object.keys(response.answers).length : 0;
            questionCounts[answeredCount] = (questionCounts[answeredCount] || 0) + 1;
        });

        // Create cumulative funnel
        const sortedQuestions = Object.keys(questionCounts).sort((a, b) => Number(a) - Number(b));
        let cumulative = totalStarted;

        sortedQuestions.forEach(questionNum => {
            funnel.push({
                step: `Question ${questionNum}`,
                count: cumulative,
                percentage: ((cumulative / totalStarted) * 100).toFixed(1)
            });
            cumulative -= questionCounts[questionNum];
        });

        return funnel;
    }

    /**
     * Process location data for heat map
     */
    processLocationData(locations) {
        return locations.map(loc => ({
            lat: loc.coordinates[1],
            lng: loc.coordinates[0],
            intensity: 1,
            address: loc.address,
            timestamp: loc.createdAt
        }));
    }

    /**
     * Compare multiple surveys
     */
    compareSurveys(analyticsData) {
        return {
            responseComparison: analyticsData.map(data => ({
                surveyId: data.survey.id,
                surveyTitle: data.survey.title,
                responses: data.metrics.totalResponses,
                completionRate: data.metrics.completionRate,
                avgTime: data.metrics.averageTimeMs
            })),
            timelineComparison: this.compareTimelines(analyticsData),
            questionTypeComparison: this.compareQuestionTypes(analyticsData)
        };
    }

    /**
     * Compare timelines across surveys
     */
    compareTimelines(analyticsData) {
        const allDates = new Set();

        analyticsData.forEach(data => {
            data.timeline.forEach(point => allDates.add(point.date));
        });

        const sortedDates = Array.from(allDates).sort();

        return sortedDates.map(date => {
            const point = { date };
            analyticsData.forEach((data, index) => {
                const timelinePoint = data.timeline.find(t => t.date === date);
                point[`survey${index}`] = timelinePoint ? timelinePoint.count : 0;
            });
            return point;
        });
    }

    /**
     * Compare question types across surveys
     */
    compareQuestionTypes(analyticsData) {
        const typeComparison = {};

        analyticsData.forEach((data, index) => {
            data.questionBreakdown.forEach(q => {
                if (!typeComparison[q.type]) {
                    typeComparison[q.type] = {};
                }
                typeComparison[q.type][`survey${index}`] =
                    (typeComparison[q.type][`survey${index}`] || 0) + 1;
            });
        });

        return typeComparison;
    }

    /**
     * Identify trends across surveys
     */
    identifyTrends(analyticsData) {
        const trends = [];

        // Response trend
        const responseCounts = analyticsData.map(d => d.metrics.totalResponses);
        if (responseCounts.length > 1) {
            const trend = this.calculateTrend(responseCounts);
            trends.push({
                metric: 'Responses',
                direction: trend > 0 ? 'increasing' : 'decreasing',
                percentage: Math.abs(trend).toFixed(1)
            });
        }

        // Completion rate trend
        const completionRates = analyticsData.map(d => parseFloat(d.metrics.completionRate));
        if (completionRates.length > 1) {
            const trend = this.calculateTrend(completionRates);
            trends.push({
                metric: 'Completion Rate',
                direction: trend > 0 ? 'increasing' : 'decreasing',
                percentage: Math.abs(trend).toFixed(1)
            });
        }

        return trends;
    }

    /**
     * Aggregate metrics across surveys
     */
    aggregateMetrics(analyticsData) {
        const total = analyticsData.reduce((acc, data) => {
            acc.responses += data.metrics.totalResponses;
            acc.complete += data.metrics.completeResponses;
            acc.totalTime += data.metrics.averageTimeMs * data.metrics.totalResponses;
            return acc;
        }, { responses: 0, complete: 0, totalTime: 0 });

        return {
            totalResponses: total.responses,
            totalComplete: total.complete,
            avgCompletionRate: total.responses > 0
                ? ((total.complete / total.responses) * 100).toFixed(1)
                : 0,
            avgTime: this.formatDuration(total.totalTime / total.responses),
            surveysCompared: analyticsData.length
        };
    }

    // Utility functions

    calculateDistribution(values, options = null) {
        const dist = {};
        values.forEach(value => {
            dist[value] = (dist[value] || 0) + 1;
        });

        if (options) {
            options.forEach(opt => {
                if (!(opt in dist)) dist[opt] = 0;
            });
        }

        return Object.entries(dist)
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count);
    }

    calculateCheckboxDistribution(responses, options) {
        const dist = {};
        options.forEach(opt => dist[opt] = 0);

        responses.forEach(response => {
            if (Array.isArray(response)) {
                response.forEach(val => {
                    dist[val] = (dist[val] || 0) + 1;
                });
            }
        });

        return Object.entries(dist)
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count);
    }

    findMostCommon(values) {
        const dist = {};
        values.forEach(v => dist[v] = (dist[v] || 0) + 1);
        const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
        return sorted.length > 0 ? sorted[0][0] : null;
    }

    calculateAverage(values) {
        const nums = values.map(Number).filter(n => !isNaN(n));
        return nums.length > 0
            ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)
            : 0;
    }

    calculateMedian(values) {
        const sorted = values.sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }

    calculateAverageLength(values) {
        const lengths = values.map(v => String(v).length);
        return lengths.length > 0
            ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
            : 0;
    }

    generateWordFrequency(responses, limit = 20) {
        const words = {};
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'was', 'are', 'were', 'be', 'been', 'being']);

        responses.forEach(response => {
            const text = String(response).toLowerCase();
            text.split(/\W+/).forEach(word => {
                if (word.length > 3 && !stopWords.has(word)) {
                    words[word] = (words[word] || 0) + 1;
                }
            });
        });

        return Object.entries(words)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([word, count]) => ({ word, count }));
    }

    calculateTrend(values) {
        if (values.length < 2) return 0;
        const first = values[0];
        const last = values[values.length - 1];
        return first > 0 ? ((last - first) / first) * 100 : 0;
    }

    getAgeGroup(age) {
        age = Number(age);
        if (age < 18) return 'Under 18';
        if (age < 25) return '18-24';
        if (age < 35) return '25-34';
        if (age < 45) return '35-44';
        if (age < 55) return '45-54';
        if (age < 65) return '55-64';
        return '65+';
    }

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    formatDuration(ms) {
        if (ms < 1000) return '< 1s';
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m`;
    }

    // Cache management
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        if (Date.now() - cached.timestamp > this.cacheExpiry) {
            this.cache.delete(key);
            return null;
        }
        return cached.data;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }
}
