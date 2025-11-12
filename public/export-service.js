/**
 * Export Service
 * Handles PDF, Excel, and image exports for analytics dashboard
 */
class ExportService {
    constructor(chartService) {
        this.chartService = chartService;
    }

    /**
     * Export dashboard as PDF
     */
    async exportToPDF(options = {}) {
        try {
            // Use jsPDF library (will be loaded via CDN)
            if (typeof jspdf === 'undefined') {
                alert('PDF export library not loaded. Please check your internet connection.');
                return;
            }

            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            let yPosition = 20;

            // Add title
            pdf.setFontSize(20);
            pdf.setFont(undefined, 'bold');
            pdf.text(options.title || 'Analytics Dashboard Report', 20, yPosition);
            yPosition += 10;

            // Add date
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, yPosition);
            yPosition += 15;

            // Add metrics section
            if (options.metrics) {
                pdf.setFontSize(14);
                pdf.setFont(undefined, 'bold');
                pdf.text('Key Metrics', 20, yPosition);
                yPosition += 8;

                pdf.setFontSize(10);
                pdf.setFont(undefined, 'normal');
                Object.entries(options.metrics).forEach(([key, value]) => {
                    pdf.text(`${key}: ${value}`, 25, yPosition);
                    yPosition += 6;
                });
                yPosition += 10;
            }

            // Add charts
            if (options.charts && options.charts.length > 0) {
                for (const chartId of options.charts) {
                    if (yPosition > pageHeight - 100) {
                        pdf.addPage();
                        yPosition = 20;
                    }

                    const chartImage = this.chartService.getChartDataURL(chartId);
                    if (chartImage) {
                        const imgWidth = pageWidth - 40;
                        const imgHeight = 80;
                        pdf.addImage(chartImage, 'PNG', 20, yPosition, imgWidth, imgHeight);
                        yPosition += imgHeight + 15;
                    }
                }
            }

            // Save PDF
            const filename = options.filename || `analytics-report-${Date.now()}.pdf`;
            pdf.save(filename);

            return true;
        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Error exporting PDF. Please try again.');
            return false;
        }
    }

    /**
     * Export data to Excel
     */
    async exportToExcel(data, options = {}) {
        try {
            // Create CSV format (compatible with Excel)
            let csv = '';

            // Add title
            if (options.title) {
                csv += `${options.title}\n`;
                csv += `Generated: ${new Date().toLocaleString()}\n\n`;
            }

            // Add metrics section
            if (data.metrics) {
                csv += 'Key Metrics\n';
                Object.entries(data.metrics).forEach(([key, value]) => {
                    csv += `${key},${value}\n`;
                });
                csv += '\n';
            }

            // Add response data
            if (data.responses && data.responses.length > 0) {
                csv += 'Survey Responses\n';

                // Headers
                const headers = Object.keys(data.responses[0]);
                csv += headers.join(',') + '\n';

                // Data rows
                data.responses.forEach(response => {
                    const row = headers.map(header => {
                        const value = response[header];
                        // Escape commas and quotes
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    });
                    csv += row.join(',') + '\n';
                });
                csv += '\n';
            }

            // Add question breakdown
            if (data.questionBreakdown && data.questionBreakdown.length > 0) {
                csv += 'Question Analysis\n';
                csv += 'Question,Type,Total Responses,Response Rate\n';

                data.questionBreakdown.forEach(q => {
                    csv += `"${q.question}",${q.type},${q.totalResponses},${q.responseRate}%\n`;
                });
            }

            // Create blob and download
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', options.filename || `analytics-export-${Date.now()}.csv`);
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Error exporting to Excel. Please try again.');
            return false;
        }
    }

    /**
     * Export individual chart as image
     */
    exportChartAsImage(chartId, filename) {
        try {
            this.chartService.exportChartAsImage(chartId, filename);
            return true;
        } catch (error) {
            console.error('Error exporting chart:', error);
            return false;
        }
    }

    /**
     * Export all charts as images (zip)
     */
    async exportAllChartsAsImages(chartIds, options = {}) {
        try {
            // Create a simple approach: download each chart separately
            // In a real implementation, you could use JSZip to create a zip file
            for (let i = 0; i < chartIds.length; i++) {
                const chartId = chartIds[i];
                const filename = `chart-${i + 1}-${Date.now()}.png`;

                // Small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 500));
                this.exportChartAsImage(chartId, filename);
            }

            return true;
        } catch (error) {
            console.error('Error exporting charts:', error);
            return false;
        }
    }

    /**
     * Print dashboard
     */
    printDashboard() {
        window.print();
    }

    /**
     * Export data as JSON
     */
    exportToJSON(data, filename) {
        try {
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', filename || `analytics-data-${Date.now()}.json`);
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Error exporting JSON:', error);
            return false;
        }
    }

    /**
     * Show export modal
     */
    showExportModal(data, charts) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            ">
                <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Export Dashboard</h2>

                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <button onclick="exportService.exportToPDF({
                        title: 'Analytics Dashboard Report',
                        metrics: ${JSON.stringify(data.metrics)},
                        charts: ${JSON.stringify(charts)}
                    }); this.closest('[style*=fixed]').remove();"
                    style="
                        padding: 15px;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">
                        📄 Export as PDF
                    </button>

                    <button onclick="exportService.exportToExcel(${JSON.stringify(data)}); this.closest('[style*=fixed]').remove();"
                    style="
                        padding: 15px;
                        background: #10b981;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">
                        📊 Export as Excel
                    </button>

                    <button onclick="exportService.exportAllChartsAsImages(${JSON.stringify(charts)}); this.closest('[style*=fixed]').remove();"
                    style="
                        padding: 15px;
                        background: #3b82f6;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">
                        🖼️ Export Charts as Images
                    </button>

                    <button onclick="exportService.exportToJSON(${JSON.stringify(data)}); this.closest('[style*=fixed]').remove();"
                    style="
                        padding: 15px;
                        background: #f59e0b;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">
                        💾 Export as JSON
                    </button>

                    <button onclick="exportService.printDashboard(); this.closest('[style*=fixed]').remove();"
                    style="
                        padding: 15px;
                        background: #64748b;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">
                        🖨️ Print Dashboard
                    </button>

                    <button onclick="this.closest('[style*=fixed]').remove();"
                    style="
                        padding: 15px;
                        background: #f1f5f9;
                        color: #1e293b;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}
