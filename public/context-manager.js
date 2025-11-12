// Context Manager Component
// Manages AI context and reference files

class ContextManager {
  constructor(aiService) {
    this.aiService = aiService;
    this.files = [];
    this.context = {};
    this.isOpen = false;

    this.init();
  }

  init() {
    this.createModal();
    this.loadContextFiles();
  }

  createModal() {
    const modal = document.createElement('div');
    modal.id = 'contextManagerModal';
    modal.innerHTML = `
      <div class="context-modal-overlay" id="contextModalOverlay">
        <div class="context-modal">
          <div class="context-modal-header">
            <h2>Context Management</h2>
            <button class="context-modal-close" id="contextModalClose">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="context-modal-body">
            <!-- Context Text Area -->
            <div class="context-section">
              <h3>📝 Context Information</h3>
              <textarea
                id="contextText"
                placeholder="Add context information that AI should know about (e.g., industry, target audience, specific requirements...)"
                rows="6"
              ></textarea>
            </div>

            <!-- Reference Files -->
            <div class="context-section">
              <h3>📁 Reference Files</h3>
              <p class="context-help">Upload documents that provide context for AI assistance.</p>

              <div class="file-upload-area">
                <input type="file" id="contextFileInput" multiple style="display: none;"
                       accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json">
                <button class="btn btn-primary" id="uploadFileBtn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Upload Files
                </button>
              </div>

              <div class="files-list" id="contextFilesList">
                <div class="files-loading">Loading files...</div>
              </div>
            </div>

            <!-- Context Suggestions -->
            <div class="context-section">
              <h3>💡 Context Suggestions</h3>
              <p class="context-help">Quick templates to get started.</p>

              <div class="context-suggestions">
                <button class="context-suggestion-btn" data-template="customer-satisfaction">
                  Customer Satisfaction Survey
                </button>
                <button class="context-suggestion-btn" data-template="employee-engagement">
                  Employee Engagement Survey
                </button>
                <button class="context-suggestion-btn" data-template="product-feedback">
                  Product Feedback Survey
                </button>
                <button class="context-suggestion-btn" data-template="event-feedback">
                  Event Feedback Survey
                </button>
              </div>
            </div>
          </div>

          <div class="context-modal-footer">
            <button class="btn btn-secondary" id="contextCancelBtn">Cancel</button>
            <button class="btn btn-success" id="contextSaveBtn">Save Context</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.addStyles();
    this.attachEventListeners();
  }

  addStyles() {
    if (document.getElementById('contextManagerStyles')) return;

    const styles = document.createElement('style');
    styles.id = 'contextManagerStyles';
    styles.textContent = `
      .context-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        padding: 20px;
      }

      .context-modal-overlay.active {
        display: flex;
      }

      .context-modal {
        background: white;
        border-radius: 12px;
        max-width: 700px;
        width: 100%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: modalSlideIn 0.3s ease-out;
      }

      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .context-modal-header {
        padding: 24px;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .context-modal-header h2 {
        font-size: 20px;
        color: #1e293b;
        margin: 0;
      }

      .context-modal-close {
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .context-modal-close:hover {
        background: #f1f5f9;
      }

      .context-modal-body {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
      }

      .context-section {
        margin-bottom: 32px;
      }

      .context-section:last-child {
        margin-bottom: 0;
      }

      .context-section h3 {
        font-size: 16px;
        color: #1e293b;
        margin-bottom: 12px;
      }

      .context-help {
        font-size: 13px;
        color: #64748b;
        margin-bottom: 16px;
      }

      .context-section textarea {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
        font-family: inherit;
        resize: vertical;
        transition: border-color 0.2s;
      }

      .context-section textarea:focus {
        outline: none;
        border-color: #667eea;
      }

      .file-upload-area {
        margin-bottom: 16px;
      }

      .files-list {
        background: #f8fafc;
        border-radius: 8px;
        padding: 16px;
        min-height: 100px;
      }

      .files-loading {
        text-align: center;
        color: #94a3b8;
        font-size: 14px;
      }

      .file-item {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .file-item:last-child {
        margin-bottom: 0;
      }

      .file-info {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }

      .file-icon {
        color: #667eea;
      }

      .file-details {
        flex: 1;
      }

      .file-name {
        font-size: 14px;
        color: #1e293b;
        font-weight: 500;
      }

      .file-meta {
        font-size: 12px;
        color: #64748b;
        margin-top: 2px;
      }

      .file-remove {
        background: none;
        border: none;
        color: #ef4444;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .file-remove:hover {
        background: #fee2e2;
      }

      .context-suggestions {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .context-suggestion-btn {
        background: #f8fafc;
        border: 2px solid #e2e8f0;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
        color: #334155;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        font-weight: 500;
      }

      .context-suggestion-btn:hover {
        background: #f1f5f9;
        border-color: #667eea;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }

      .context-modal-footer {
        padding: 24px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      @media (max-width: 768px) {
        .context-suggestions {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  attachEventListeners() {
    const overlay = document.getElementById('contextModalOverlay');
    const closeBtn = document.getElementById('contextModalClose');
    const cancelBtn = document.getElementById('contextCancelBtn');
    const saveBtn = document.getElementById('contextSaveBtn');
    const uploadBtn = document.getElementById('uploadFileBtn');
    const fileInput = document.getElementById('contextFileInput');

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    closeBtn.addEventListener('click', () => this.close());
    cancelBtn.addEventListener('click', () => this.close());
    saveBtn.addEventListener('click', () => this.saveContext());
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

    // Context suggestions
    document.querySelectorAll('.context-suggestion-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const template = e.currentTarget.dataset.template;
        this.applyTemplate(template);
      });
    });
  }

  open() {
    this.isOpen = true;
    document.getElementById('contextModalOverlay').classList.add('active');
    this.loadCurrentContext();
  }

  close() {
    this.isOpen = false;
    document.getElementById('contextModalOverlay').classList.remove('active');
  }

  async loadContextFiles() {
    try {
      const data = await this.aiService.getContextFiles();
      this.files = data.files || [];
      this.displayFiles();
    } catch (error) {
      console.error('Load context files error:', error);
      this.displayFiles();
    }
  }

  displayFiles() {
    const filesList = document.getElementById('contextFilesList');

    if (this.files.length === 0) {
      filesList.innerHTML = '<div class="files-loading">No files uploaded yet.</div>';
      return;
    }

    let html = '';
    this.files.forEach(file => {
      const fileSize = this.formatFileSize(file.size);
      const uploadDate = new Date(file.uploadedAt).toLocaleDateString();

      html += `
        <div class="file-item">
          <div class="file-info">
            <div class="file-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
              </svg>
            </div>
            <div class="file-details">
              <div class="file-name">${file.filename}</div>
              <div class="file-meta">${fileSize} • ${uploadDate}</div>
            </div>
          </div>
          <button class="file-remove" data-filename="${file.filename}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;
    });

    filesList.innerHTML = html;

    // Attach remove listeners
    document.querySelectorAll('.file-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filename = e.currentTarget.dataset.filename;
        this.removeFile(filename);
      });
    });
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async handleFileUpload(event) {
    const files = Array.from(event.target.files);

    for (const file of files) {
      try {
        await this.aiService.uploadContextFile(file);
      } catch (error) {
        console.error('File upload error:', error);
        alert(`Failed to upload ${file.name}`);
      }
    }

    // Clear input
    event.target.value = '';

    // Reload files
    await this.loadContextFiles();
  }

  async removeFile(filename) {
    if (!confirm(`Remove ${filename}?`)) return;

    try {
      await this.aiService.deleteContextFile(filename);
      await this.loadContextFiles();
    } catch (error) {
      console.error('Remove file error:', error);
      alert('Failed to remove file.');
    }
  }

  loadCurrentContext() {
    const contextText = document.getElementById('contextText');
    contextText.value = JSON.stringify(this.aiService.context, null, 2);
  }

  saveContext() {
    const contextText = document.getElementById('contextText').value.trim();

    try {
      if (contextText) {
        // Try to parse as JSON first
        try {
          this.context = JSON.parse(contextText);
        } catch {
          // If not JSON, treat as plain text
          this.context = { description: contextText };
        }

        this.aiService.setContext(this.context);
      }

      // Update chat widget context display
      if (window.aiChatWidget) {
        window.aiChatWidget.updateContextDisplay(
          contextText ? 'Context set' : 'No context'
        );
      }

      alert('Context saved successfully!');
      this.close();
    } catch (error) {
      console.error('Save context error:', error);
      alert('Failed to save context.');
    }
  }

  applyTemplate(template) {
    const templates = {
      'customer-satisfaction': {
        industry: 'Customer Service',
        goal: 'Measure customer satisfaction',
        targetAudience: 'Recent customers',
        focusAreas: ['Service quality', 'Response time', 'Overall satisfaction']
      },
      'employee-engagement': {
        industry: 'Human Resources',
        goal: 'Assess employee engagement',
        targetAudience: 'All employees',
        focusAreas: ['Work environment', 'Management', 'Career development']
      },
      'product-feedback': {
        industry: 'Product Development',
        goal: 'Gather product feedback',
        targetAudience: 'Product users',
        focusAreas: ['Features', 'Usability', 'Value proposition']
      },
      'event-feedback': {
        industry: 'Event Management',
        goal: 'Collect event feedback',
        targetAudience: 'Event attendees',
        focusAreas: ['Content quality', 'Organization', 'Venue']
      }
    };

    const contextText = document.getElementById('contextText');
    const templateData = templates[template];

    if (templateData) {
      contextText.value = JSON.stringify(templateData, null, 2);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContextManager;
}

// Initialize context manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.surveyBuilder && window.surveyBuilder.aiService) {
    window.contextManager = new ContextManager(window.surveyBuilder.aiService);
  }
});
