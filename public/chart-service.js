/**
 * Chart Service
 * Wrapper around Chart.js for creating various chart types
 */
class ChartService {
    constructor() {
        this.charts = new Map();
        this.defaultColors = [
            '#667eea', '#764ba2', '#f093fb', '#4facfe',
            '#43e97b', '#fa709a', '#fee140', '#30cfd0',
            '#a8edea', '#fed6e3', '#c471f5', '#17ead9'
        ];
    }

    /**
     * Create or update a bar chart
     */
    createBarChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas ${canvasId} not found`);
            return null;
        }

        const config = {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: options.label || 'Data',
                    data: data.values,
                    backgroundColor: options.colors || this.defaultColors[0],
                    borderColor: options.borderColor || this.defaultColors[0],
                    borderWidth: 1,
                    borderRadius: 8,
                    ...options.datasetOptions
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: options.showLegend !== false,
                        position: options.legendPosition || 'top'
                    },
                    title: {
                        display: !!options.title,
                        text: options.title || '',
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: options.tooltipCallbacks || {}
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: options.yAxisTicks || {}
                    },
                    x: {
                        grid: { display: false },
                        ticks: options.xAxisTicks || {}
                    }
                },
                ...options.chartOptions
            }
        };

        return this.createOrUpdateChart(canvasId, config);
    }

    /**
     * Create or update a line chart
     */
    createLineChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas ${canvasId} not found`);
            return null;
        }

        const datasets = Array.isArray(data.datasets) ? data.datasets : [{
            label: options.label || 'Data',
            data: data.values,
            borderColor: options.color || this.defaultColors[0],
            backgroundColor: this.hexToRgba(options.color || this.defaultColors[0], 0.1),
            fill: options.fill !== false,
            tension: options.tension || 0.4,
            pointRadius: options.pointRadius || 3,
            pointHoverRadius: options.pointHoverRadius || 6,
            borderWidth: 2
        }];

        const config = {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: options.showLegend !== false,
                        position: options.legendPosition || 'top'
                    },
                    title: {
                        display: !!options.title,
                        text: options.title || '',
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: options.tooltipCallbacks || {}
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                ...options.chartOptions
            }
        };

        return this.createOrUpdateChart(canvasId, config);
    }

    /**
     * Create or update a pie chart
     */
    createPieChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas ${canvasId} not found`);
            return null;
        }

        const colors = options.colors || this.generateColors(data.labels.length);

        const config = {
            type: 'pie',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: options.showLegend !== false,
                        position: options.legendPosition || 'right',
                        labels: {
                            padding: 15,
                            font: { size: 12 }
                        }
                    },
                    title: {
                        display: !!options.title,
                        text: options.title || '',
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            },
                            ...options.tooltipCallbacks
                        }
                    }
                },
                ...options.chartOptions
            }
        };

        return this.createOrUpdateChart(canvasId, config);
    }

    /**
     * Create or update a donut chart
     */
    createDonutChart(canvasId, data, options = {}) {
        options.chartOptions = {
            ...options.chartOptions,
            cutout: options.cutout || '60%'
        };
        return this.createPieChart(canvasId, data, { ...options, type: 'doughnut' });
    }

    /**
     * Create or update a horizontal bar chart
     */
    createHorizontalBarChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas ${canvasId} not found`);
            return null;
        }

        const config = {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: options.label || 'Data',
                    data: data.values,
                    backgroundColor: options.colors || this.defaultColors[0],
                    borderColor: options.borderColor || this.defaultColors[0],
                    borderWidth: 1,
                    borderRadius: 8
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: options.showLegend !== false,
                        position: options.legendPosition || 'top'
                    },
                    title: {
                        display: !!options.title,
                        text: options.title || '',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    y: {
                        grid: { display: false }
                    }
                },
                ...options.chartOptions
            }
        };

        return this.createOrUpdateChart(canvasId, config);
    }

    /**
     * Create or update a scatter plot
     */
    createScatterChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas ${canvasId} not found`);
            return null;
        }

        const config = {
            type: 'scatter',
            data: {
                datasets: [{
                    label: options.label || 'Data',
                    data: data.points,
                    backgroundColor: options.color || this.defaultColors[0],
                    borderColor: options.borderColor || this.defaultColors[0],
                    pointRadius: options.pointRadius || 5,
                    pointHoverRadius: options.pointHoverRadius || 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: options.showLegend !== false
                    },
                    title: {
                        display: !!options.title,
                        text: options.title || '',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: !!options.xAxisLabel,
                            text: options.xAxisLabel || ''
                        }
                    },
                    y: {
                        title: {
                            display: !!options.yAxisLabel,
                            text: options.yAxisLabel || ''
                        }
                    }
                },
                ...options.chartOptions
            }
        };

        return this.createOrUpdateChart(canvasId, config);
    }

    /**
     * Create or update a gauge chart
     */
    createGaugeChart(canvasId, value, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas ${canvasId} not found`);
            return null;
        }

        const maxValue = options.max || 100;
        const minValue = options.min || 0;
        const percentage = ((value - minValue) / (maxValue - minValue)) * 100;

        const config = {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [percentage, 100 - percentage],
                    backgroundColor: [
                        options.color || this.getGaugeColor(percentage),
                        'rgba(200, 200, 200, 0.2)'
                    ],
                    borderWidth: 0,
                    circumference: 180,
                    rotation: 270
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { display: false },
                    title: {
                        display: !!options.title,
                        text: options.title || '',
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: { enabled: false }
                },
                ...options.chartOptions
            },
            plugins: [{
                id: 'gaugeText',
                afterDatasetDraw: (chart) => {
                    const { ctx, chartArea: { width, height } } = chart;
                    ctx.save();
                    const fontSize = (height / 4).toFixed(2);
                    ctx.font = `bold ${fontSize}px Inter`;
                    ctx.fillStyle = options.textColor || '#1e293b';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(
                        options.displayValue || `${value}${options.suffix || '%'}`,
                        width / 2,
                        height / 1.5
                    );
                    ctx.restore();
                }
            }]
        };

        return this.createOrUpdateChart(canvasId, config);
    }

    /**
     * Create or update a multi-dataset chart
     */
    createMultiLineChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas ${canvasId} not found`);
            return null;
        }

        const datasets = data.datasets.map((dataset, index) => ({
            label: dataset.label,
            data: dataset.values,
            borderColor: dataset.color || this.defaultColors[index % this.defaultColors.length],
            backgroundColor: this.hexToRgba(
                dataset.color || this.defaultColors[index % this.defaultColors.length],
                0.1
            ),
            fill: dataset.fill !== false,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6
        }));

        const config = {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: options.legendPosition || 'top'
                    },
                    title: {
                        display: !!options.title,
                        text: options.title || '',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                ...options.chartOptions
            }
        };

        return this.createOrUpdateChart(canvasId, config);
    }

    /**
     * Create or update a stacked bar chart
     */
    createStackedBarChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas ${canvasId} not found`);
            return null;
        }

        const datasets = data.datasets.map((dataset, index) => ({
            label: dataset.label,
            data: dataset.values,
            backgroundColor: dataset.color || this.defaultColors[index % this.defaultColors.length],
            borderRadius: 8,
            borderWidth: 0
        }));

        const config = {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: options.legendPosition || 'top'
                    },
                    title: {
                        display: !!options.title,
                        text: options.title || '',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    }
                },
                ...options.chartOptions
            }
        };

        return this.createOrUpdateChart(canvasId, config);
    }

    /**
     * Create or update a polar area chart
     */
    createPolarChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas ${canvasId} not found`);
            return null;
        }

        const colors = options.colors || this.generateColors(data.labels.length);

        const config = {
            type: 'polarArea',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: colors.map(c => this.hexToRgba(c, 0.6)),
                    borderColor: colors,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: options.showLegend !== false,
                        position: options.legendPosition || 'right'
                    },
                    title: {
                        display: !!options.title,
                        text: options.title || '',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                ...options.chartOptions
            }
        };

        return this.createOrUpdateChart(canvasId, config);
    }

    /**
     * Update chart data
     */
    updateChart(canvasId, newData, datasetIndex = 0) {
        const chart = this.charts.get(canvasId);
        if (!chart) {
            console.error(`Chart ${canvasId} not found`);
            return;
        }

        if (newData.labels) {
            chart.data.labels = newData.labels;
        }

        if (newData.values) {
            if (chart.data.datasets[datasetIndex]) {
                chart.data.datasets[datasetIndex].data = newData.values;
            }
        }

        if (newData.datasets) {
            chart.data.datasets = newData.datasets;
        }

        chart.update('active');
    }

    /**
     * Animate chart update
     */
    animateUpdate(canvasId, newData, duration = 750) {
        const chart = this.charts.get(canvasId);
        if (!chart) return;

        if (newData.labels) chart.data.labels = newData.labels;
        if (newData.values && chart.data.datasets[0]) {
            chart.data.datasets[0].data = newData.values;
        }

        chart.update({
            duration: duration,
            easing: 'easeInOutQuart'
        });
    }

    /**
     * Destroy a chart
     */
    destroyChart(canvasId) {
        const chart = this.charts.get(canvasId);
        if (chart) {
            chart.destroy();
            this.charts.delete(canvasId);
        }
    }

    /**
     * Destroy all charts
     */
    destroyAllCharts() {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }

    /**
     * Export chart as image
     */
    exportChartAsImage(canvasId, filename = 'chart.png') {
        const chart = this.charts.get(canvasId);
        if (!chart) {
            console.error(`Chart ${canvasId} not found`);
            return;
        }

        const url = chart.toBase64Image();
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
    }

    /**
     * Get chart data URL
     */
    getChartDataURL(canvasId) {
        const chart = this.charts.get(canvasId);
        return chart ? chart.toBase64Image() : null;
    }

    // Private methods

    createOrUpdateChart(canvasId, config) {
        // Destroy existing chart if it exists
        this.destroyChart(canvasId);

        // Create new chart
        const ctx = document.getElementById(canvasId);
        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);

        return chart;
    }

    generateColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(this.defaultColors[i % this.defaultColors.length]);
        }
        return colors;
    }

    hexToRgba(hex, alpha = 1) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    getGaugeColor(percentage) {
        if (percentage < 33) return '#ef4444';
        if (percentage < 66) return '#f59e0b';
        return '#10b981';
    }
}
