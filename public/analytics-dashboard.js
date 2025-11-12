/**
 * Analytics Dashboard Controller
 * Main controller for the analytics dashboard
 */
class AnalyticsDashboard {
    constructor() {
        this.analyticsService = new AnalyticsService();
        this.chartService = new ChartService();
        this.wsService = new WebSocketService();
        this.exportService = new ExportService(this.chartService);

        this.currentView = 'single';
        this.currentSurveyId = null;
        this.currentSurveyIds = [];
        this.currentData = null;
        this.filters = {
            dateRange: 'all',
            startDate: null,
            endDate: null,
            location: null,
            timelineInterval: 'day'
        };
        this.filtersVisible = false;
    }

    /**
     * Initialize dashboard
     */
    async init() {
        try {
            // Load available surveys
            await this.loadSurveys();

            // Setup WebSocket for real-time updates
            this.setupWebSocket();

            // Setup event listeners
            this.setupEventListeners();

            // Load first survey if available
            const surveySelector = document.getElementById('surveySelector');
            if (surveySelector.options.length > 1) {
                this.currentSurveyId = surveySelector.options[1].value;
                surveySelector.value = this.currentSurveyId;
                surveySelector.classList.remove('hidden');
                await this.loadSingleSurveyDashboard(this.currentSurveyId);
            } else {
                this.showMessage('No surveys available. Please create a survey first.', 'info');
            }
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError('Failed to initialize dashboard. Please refresh the page.');
        }
    }

    /**
     * Load available surveys
     */
    async loadSurveys() {
        try {
            const response = await fetch('/api/surveys');
            if (!response.ok) throw new Error('Failed to load surveys');

            const surveys = await response.json();

            const surveySelector = document.getElementById('surveySelector');
            const comparisonSelector = document.getElementById('comparisonSelector');

            surveys.forEach(survey => {
                const option1 = document.createElement('option');
                option1.value = survey.id;
                option1.textContent = survey.title || `Survey ${survey.id}`;
                surveySelector.appendChild(option1);

                const option2 = option1.cloneNode(true);
                comparisonSelector.appendChild(option2);
            });
        } catch (error) {
            console.error('Error loading surveys:', error);
        }
    }

    /**
     * Setup WebSocket for real-time updates
     */
    setupWebSocket() {
        this.wsService.on('connected', () => {
            console.log('Real-time updates enabled');
            document.getElementById('liveIndicator').classList.remove('hidden');

            // Subscribe to current survey(s)
            if (this.currentView === 'single' && this.currentSurveyId) {
                this.wsService.subscribeSurvey(this.currentSurveyId);
            } else if (this.currentView === 'comparison' && this.currentSurveyIds.length > 0) {
                this.wsService.subscribeMultiple(this.currentSurveyIds);
            }
        });

        this.wsService.on('disconnected', () => {
            document.getElementById('liveIndicator').classList.add('hidden');
        });

        this.wsService.on('newResponse', (data) => {
            this.handleNewResponse(data);
        });

        this.wsService.on('metricsUpdate', (data) => {
            this.handleMetricsUpdate(data);
        });

        this.wsService.on('locationUpdate', (data) => {
            this.handleLocationUpdate(data);
        });

        // Connect to WebSocket
        this.wsService.connect();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.getElementById('surveySelector')?.addEventListener('change', (e) => {
            this.currentSurveyId = e.target.value;
            if (this.currentSurveyId) {
                this.loadSingleSurveyDashboard(this.currentSurveyId);
            }
        });
    }

    /**
     * Change dashboard view
     */
    async changeView(view) {
        this.currentView = view;

        const surveySelector = document.getElementById('surveySelector');
        const comparisonSelector = document.getElementById('comparisonSelector');

        if (view === 'single') {
            surveySelector.classList.remove('hidden');
            comparisonSelector.classList.add('hidden');

            if (this.currentSurveyId) {
                await this.loadSingleSurveyDashboard(this.currentSurveyId);
            }
        } else if (view === 'comparison') {
            surveySelector.classList.add('hidden');
            comparisonSelector.classList.remove('hidden');

            // Load comparison if surveys selected
            const selected = Array.from(comparisonSelector.selectedOptions).map(o => o.value);
            if (selected.length > 0) {
                this.currentSurveyIds = selected;
                await this.loadComparisonDashboard(selected);
            }
        }
    }

    /**
     * Load single survey dashboard
     */
    async loadSingleSurveyDashboard(surveyId) {
        try {
            this.showLoading();

            // Clear existing charts
            this.chartService.destroyAllCharts();

            // Fetch analytics data
            const data = await this.analyticsService.getSurveyAnalytics(surveyId);
            this.currentData = data;

            // Apply filters if any
            const filteredData = this.applyDataFilters(data);

            // Subscribe to real-time updates
            if (this.wsService.isWebSocketConnected()) {
                this.wsService.subscribeSurvey(surveyId);
            }

            // Render dashboard
            this.renderSingleSurveyDashboard(filteredData);

        } catch (error) {
            console.error('Error loading survey dashboard:', error);
            this.showError('Failed to load survey data. Please try again.');
        }
    }

    /**
     * Render single survey dashboard
     */
    renderSingleSurveyDashboard(data) {
        const content = document.getElementById('dashboardContent');

        content.innerHTML = `
            <!-- Metrics Grid -->
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                        📊
                    </div>
                    <div class="value">${data.metrics.totalResponses}</div>
                    <div class="label">Total Responses</div>
                    <div class="change positive">↑ ${data.metrics.responsesLast24h} in last 24h</div>
                </div>

                <div class="metric-card">
                    <div class="icon" style="background: #d1fae5; color: #059669;">
                        ✓
                    </div>
                    <div class="value">${data.metrics.completionRate}%</div>
                    <div class="label">Completion Rate</div>
                    <div class="change ${data.metrics.completionRate > 70 ? 'positive' : 'negative'}">
                        ${data.metrics.completeResponses} completed
                    </div>
                </div>

                <div class="metric-card">
                    <div class="icon" style="background: #ddd6fe; color: #7c3aed;">
                        ⏱️
                    </div>
                    <div class="value">${data.metrics.averageTime}</div>
                    <div class="label">Average Time</div>
                </div>

                <div class="metric-card">
                    <div class="icon" style="background: #fef3c7; color: #d97706;">
                        📝
                    </div>
                    <div class="value">${data.metrics.questions}</div>
                    <div class="label">Total Questions</div>
                </div>
            </div>

            <!-- Charts Grid -->
            <div class="charts-grid">
                <div class="chart-card full-width">
                    <h3>Response Timeline</h3>
                    <div class="chart-container tall">
                        <canvas id="timelineChart"></canvas>
                    </div>
                </div>

                <div class="chart-card">
                    <h3>Completion Status</h3>
                    <div class="chart-container">
                        <canvas id="completionChart"></canvas>
                    </div>
                </div>

                <div class="chart-card">
                    <h3>Completion Rate</h3>
                    <div class="chart-container">
                        <canvas id="gaugeChart"></canvas>
                    </div>
                </div>

                ${data.demographics && Object.keys(data.demographics.location).length > 0 ? `
                <div class="chart-card full-width">
                    <h3>Response Locations</h3>
                    <div id="responseMap" class="map-container"></div>
                </div>
                ` : ''}

                ${data.questionBreakdown && data.questionBreakdown.length > 0 ? `
                <div class="chart-card full-width">
                    <h3>Question-by-Question Analysis</h3>
                    <div style="max-height: 600px; overflow-y: auto;">
                        ${this.renderQuestionBreakdown(data.questionBreakdown)}
                    </div>
                </div>
                ` : ''}

                ${data.demographics && Object.keys(data.demographics.device).length > 0 ? `
                <div class="chart-card">
                    <h3>Device Distribution</h3>
                    <div class="chart-container">
                        <canvas id="deviceChart"></canvas>
                    </div>
                </div>
                ` : ''}

                ${data.dropoff && data.dropoff.completionFunnel ? `
                <div class="chart-card">
                    <h3>Drop-off Analysis</h3>
                    <div class="chart-container">
                        <canvas id="dropoffChart"></canvas>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        // Render charts
        this.renderCharts(data);
    }

    /**
     * Render all charts
     */
    renderCharts(data) {
        // Timeline Chart
        if (data.timeline && data.timeline.length > 0) {
            this.chartService.createLineChart('timelineChart', {
                labels: data.timeline.map(t => t.date),
                values: data.timeline.map(t => t.count)
            }, {
                title: 'Responses Over Time',
                color: '#667eea',
                fill: true
            });
        }

        // Completion Status Chart
        this.chartService.createDonutChart('completionChart', {
            labels: ['Completed', 'Incomplete'],
            values: [data.metrics.completeResponses, data.metrics.incompleteResponses]
        }, {
            colors: ['#10b981', '#ef4444']
        });

        // Gauge Chart
        this.chartService.createGaugeChart('gaugeChart', parseFloat(data.metrics.completionRate), {
            title: 'Completion Rate',
            suffix: '%',
            max: 100
        });

        // Device Distribution
        if (data.demographics?.device && Object.keys(data.demographics.device).length > 0) {
            const deviceData = Object.entries(data.demographics.device);
            this.chartService.createPieChart('deviceChart', {
                labels: deviceData.map(([device]) => device),
                values: deviceData.map(([, count]) => count)
            });
        }

        // Drop-off Analysis
        if (data.dropoff?.completionFunnel) {
            this.chartService.createBarChart('dropoffChart', {
                labels: data.dropoff.completionFunnel.map(f => f.step),
                values: data.dropoff.completionFunnel.map(f => f.count)
            }, {
                label: 'Responses',
                colors: '#f59e0b'
            });
        }

        // Response Map
        if (data.locationData && data.locationData.length > 0) {
            this.renderResponseMap(data.locationData);
        }
    }

    /**
     * Render question breakdown
     */
    renderQuestionBreakdown(questionBreakdown) {
        return questionBreakdown.map((q, index) => {
            let chartHtml = '';

            if (q.distribution && q.distribution.length > 0) {
                const chartId = `questionChart${index}`;
                setTimeout(() => {
                    this.chartService.createHorizontalBarChart(chartId, {
                        labels: q.distribution.map(d => d.label),
                        values: q.distribution.map(d => d.count)
                    }, {
                        label: 'Responses',
                        colors: '#667eea'
                    });
                }, 100);

                chartHtml = `<div class="chart-container"><canvas id="${chartId}"></canvas></div>`;
            }

            return `
                <div style="margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 8px;">
                    <h4 style="color: #1e293b; margin-bottom: 10px;">${q.question}</h4>
                    <div style="display: flex; gap: 20px; margin-bottom: 15px; flex-wrap: wrap;">
                        <span style="color: #64748b;">
                            <strong>Type:</strong> ${q.type}
                        </span>
                        <span style="color: #64748b;">
                            <strong>Responses:</strong> ${q.totalResponses}
                        </span>
                        <span style="color: #64748b;">
                            <strong>Response Rate:</strong> ${q.responseRate}%
                        </span>
                        ${q.average ? `<span style="color: #64748b;"><strong>Average:</strong> ${q.average}</span>` : ''}
                    </div>
                    ${chartHtml}
                </div>
            `;
        }).join('');
    }

    /**
     * Render response map
     */
    renderResponseMap(locationData) {
        setTimeout(() => {
            const mapContainer = document.getElementById('responseMap');
            if (!mapContainer) return;

            // Create map
            const map = L.map('responseMap').setView([25.2048, 55.2708], 11); // Dubai default

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Add heat layer
            if (locationData.length > 0) {
                const heatData = locationData.map(loc => [loc.lat, loc.lng, loc.intensity]);
                L.heatLayer(heatData, {
                    radius: 25,
                    blur: 15,
                    maxZoom: 17
                }).addTo(map);

                // Add markers
                locationData.forEach(loc => {
                    L.marker([loc.lat, loc.lng])
                        .bindPopup(`<strong>${loc.address || 'Response Location'}</strong><br>${loc.timestamp}`)
                        .addTo(map);
                });

                // Fit bounds
                const bounds = L.latLngBounds(locationData.map(loc => [loc.lat, loc.lng]));
                map.fitBounds(bounds);
            }
        }, 100);
    }

    /**
     * Load comparison dashboard
     */
    async loadComparisonDashboard(surveyIds) {
        try {
            this.showLoading();

            this.chartService.destroyAllCharts();

            const data = await this.analyticsService.getComparisonAnalytics(surveyIds);
            this.currentData = data;

            // Subscribe to real-time updates
            if (this.wsService.isWebSocketConnected()) {
                this.wsService.subscribeMultiple(surveyIds);
            }

            this.renderComparisonDashboard(data);

        } catch (error) {
            console.error('Error loading comparison dashboard:', error);
            this.showError('Failed to load comparison data. Please try again.');
        }
    }

    /**
     * Render comparison dashboard
     */
    renderComparisonDashboard(data) {
        const content = document.getElementById('dashboardContent');

        content.innerHTML = `
            <!-- Aggregated Metrics -->
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                        📊
                    </div>
                    <div class="value">${data.aggregated.totalResponses}</div>
                    <div class="label">Total Responses (All Surveys)</div>
                </div>

                <div class="metric-card">
                    <div class="icon" style="background: #d1fae5; color: #059669;">
                        ✓
                    </div>
                    <div class="value">${data.aggregated.avgCompletionRate}%</div>
                    <div class="label">Avg Completion Rate</div>
                </div>

                <div class="metric-card">
                    <div class="icon" style="background: #ddd6fe; color: #7c3aed;">
                        ⏱️
                    </div>
                    <div class="value">${data.aggregated.avgTime}</div>
                    <div class="label">Avg Completion Time</div>
                </div>

                <div class="metric-card">
                    <div class="icon" style="background: #fef3c7; color: #d97706;">
                        📋
                    </div>
                    <div class="value">${data.aggregated.surveysCompared}</div>
                    <div class="label">Surveys Compared</div>
                </div>
            </div>

            <!-- Comparison Charts -->
            <div class="charts-grid">
                <div class="chart-card full-width">
                    <h3>Response Comparison</h3>
                    <div class="chart-container tall">
                        <canvas id="comparisonBarChart"></canvas>
                    </div>
                </div>

                <div class="chart-card full-width">
                    <h3>Timeline Comparison</h3>
                    <div class="chart-container tall">
                        <canvas id="timelineComparisonChart"></canvas>
                    </div>
                </div>

                <div class="chart-card">
                    <h3>Completion Rates</h3>
                    <div class="chart-container">
                        <canvas id="completionComparisonChart"></canvas>
                    </div>
                </div>

                <div class="chart-card">
                    <h3>Average Response Times</h3>
                    <div class="chart-container">
                        <canvas id="timeComparisonChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Individual Survey Cards -->
            <div class="comparison-grid">
                ${data.surveys.map((survey, index) => `
                    <div class="comparison-card">
                        <h4>${survey.survey.title || `Survey ${index + 1}`}</h4>
                        <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 8px;">
                            <div style="color: #64748b;">
                                <strong>Responses:</strong> ${survey.metrics.totalResponses}
                            </div>
                            <div style="color: #64748b;">
                                <strong>Completion:</strong> ${survey.metrics.completionRate}%
                            </div>
                            <div style="color: #64748b;">
                                <strong>Avg Time:</strong> ${survey.metrics.averageTime}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Render comparison charts
        this.renderComparisonCharts(data);
    }

    /**
     * Render comparison charts
     */
    renderComparisonCharts(data) {
        // Response comparison bar chart
        this.chartService.createBarChart('comparisonBarChart', {
            labels: data.comparison.responseComparison.map(s => s.surveyTitle),
            values: data.comparison.responseComparison.map(s => s.responses)
        }, {
            label: 'Total Responses',
            colors: '#667eea'
        });

        // Timeline comparison
        if (data.comparison.timelineComparison && data.comparison.timelineComparison.length > 0) {
            const datasets = data.surveys.map((survey, index) => ({
                label: survey.survey.title || `Survey ${index + 1}`,
                values: data.comparison.timelineComparison.map(t => t[`survey${index}`] || 0),
                color: this.chartService.defaultColors[index]
            }));

            this.chartService.createMultiLineChart('timelineComparisonChart', {
                labels: data.comparison.timelineComparison.map(t => t.date),
                datasets: datasets
            }, {
                title: 'Responses Over Time'
            });
        }

        // Completion rate comparison
        this.chartService.createBarChart('completionComparisonChart', {
            labels: data.comparison.responseComparison.map(s => s.surveyTitle),
            values: data.comparison.responseComparison.map(s => parseFloat(s.completionRate))
        }, {
            label: 'Completion Rate (%)',
            colors: '#10b981'
        });

        // Time comparison
        this.chartService.createBarChart('timeComparisonChart', {
            labels: data.comparison.responseComparison.map(s => s.surveyTitle),
            values: data.comparison.responseComparison.map(s => s.avgTime / 1000) // Convert to seconds
        }, {
            label: 'Avg Time (seconds)',
            colors: '#f59e0b'
        });
    }

    /**
     * Handle real-time updates
     */
    handleNewResponse(data) {
        console.log('New response received:', data);
        this.showNotification('New response received!', 'success');

        // Refresh data
        if (this.currentView === 'single' && data.surveyId === this.currentSurveyId) {
            this.refreshData();
        } else if (this.currentView === 'comparison' && this.currentSurveyIds.includes(data.surveyId)) {
            this.refreshData();
        }
    }

    handleMetricsUpdate(data) {
        console.log('Metrics updated:', data);
        // Update specific metrics without full refresh
    }

    handleLocationUpdate(data) {
        console.log('Location updated:', data);
        // Update map markers
    }

    /**
     * Toggle filters panel
     */
    toggleFilters() {
        this.filtersVisible = !this.filtersVisible;
        const panel = document.getElementById('filtersPanel');
        panel.classList.toggle('hidden', !this.filtersVisible);
    }

    /**
     * Apply filters
     */
    applyFilters() {
        const dateRange = document.getElementById('dateRangeFilter').value;
        const startDate = document.getElementById('startDateFilter').value;
        const endDate = document.getElementById('endDateFilter').value;
        const location = document.getElementById('locationFilter').value;
        const timelineInterval = document.getElementById('timelineInterval').value;

        this.filters = {
            dateRange,
            startDate,
            endDate,
            location,
            timelineInterval
        };

        // Reload current view with filters
        if (this.currentView === 'single' && this.currentSurveyId) {
            this.loadSingleSurveyDashboard(this.currentSurveyId);
        } else if (this.currentView === 'comparison' && this.currentSurveyIds.length > 0) {
            this.loadComparisonDashboard(this.currentSurveyIds);
        }
    }

    /**
     * Apply data filters
     */
    applyDataFilters(data) {
        // Apply date range filter
        if (this.filters.dateRange !== 'all' && data.responses) {
            const now = new Date();
            let startDate;

            switch (this.filters.dateRange) {
                case 'today':
                    startDate = new Date(now.setHours(0, 0, 0, 0));
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case 'custom':
                    if (this.filters.startDate) {
                        startDate = new Date(this.filters.startDate);
                    }
                    break;
            }

            if (startDate) {
                data.responses = data.responses.filter(r => {
                    const responseDate = new Date(r.timestamp || r.createdAt);
                    return responseDate >= startDate;
                });
            }
        }

        // Re-calculate metrics and timeline with filtered data
        if (data.responses) {
            data.metrics = this.analyticsService.calculateMetrics(data.survey, data.responses);
            data.timeline = this.analyticsService.generateTimeline(data.responses, this.filters.timelineInterval);
        }

        return data;
    }

    /**
     * Refresh dashboard data
     */
    async refreshData() {
        if (this.currentView === 'single' && this.currentSurveyId) {
            await this.loadSingleSurveyDashboard(this.currentSurveyId);
        } else if (this.currentView === 'comparison' && this.currentSurveyIds.length > 0) {
            await this.loadComparisonDashboard(this.currentSurveyIds);
        }
    }

    /**
     * Export dashboard
     */
    exportDashboard() {
        if (!this.currentData) {
            alert('No data to export');
            return;
        }

        const chartIds = Array.from(document.querySelectorAll('canvas')).map(c => c.id);
        this.exportService.showExportModal(this.currentData, chartIds);
    }

    /**
     * Show loading state
     */
    showLoading() {
        const content = document.getElementById('dashboardContent');
        content.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Loading dashboard data...</p>
            </div>
        `;
    }

    /**
     * Show error message
     */
    showError(message) {
        const content = document.getElementById('dashboardContent');
        content.innerHTML = `
            <div class="error-message">
                <h3>❌ Error</h3>
                <p>${message}</p>
            </div>
        `;
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    /**
     * Show message
     */
    showMessage(message, type = 'info') {
        const content = document.getElementById('dashboardContent');
        const bgColor = type === 'info' ? '#e0f2fe' : type === 'success' ? '#d1fae5' : '#fee2e2';
        const textColor = type === 'info' ? '#0369a1' : type === 'success' ? '#059669' : '#dc2626';

        content.innerHTML = `
            <div style="
                background: ${bgColor};
                color: ${textColor};
                padding: 40px;
                border-radius: 12px;
                text-align: center;
                margin: 40px 0;
            ">
                <h3 style="margin-bottom: 10px;">${message}</h3>
            </div>
        `;
    }
}

// Make services globally accessible
let exportService;
window.addEventListener('DOMContentLoaded', () => {
    if (typeof dashboard !== 'undefined') {
        exportService = dashboard.exportService;
    }
});
