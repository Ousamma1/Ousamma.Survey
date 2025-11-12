// AI Chat Widget Component
// Provides a chat interface for AI interactions

class AIChatWidget {
  constructor(container, aiService) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.aiService = aiService;
    this.isOpen = false;
    this.isMinimized = false;
    this.messageElements = [];

    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="ai-chat-widget" id="aiChatWidget">
        <!-- Chat Toggle Button -->
        <button class="ai-chat-toggle" id="aiChatToggle" title="AI Assistant">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span class="ai-chat-badge" id="aiChatBadge" style="display: none;">0</span>
        </button>

        <!-- Chat Window -->
        <div class="ai-chat-window" id="aiChatWindow" style="display: none;">
          <!-- Header -->
          <div class="ai-chat-header">
            <div class="ai-chat-header-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                <line x1="15" y1="9" x2="15.01" y2="9"></line>
              </svg>
              <span>AI Assistant</span>
            </div>
            <div class="ai-chat-header-actions">
              <button class="ai-chat-minimize" id="aiChatMinimize" title="Minimize">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              <button class="ai-chat-close" id="aiChatClose" title="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <!-- Context Bar -->
          <div class="ai-chat-context-bar" id="aiChatContextBar">
            <div class="ai-context-display" id="aiContextDisplay">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M2 12h20"></path>
              </svg>
              <span id="aiContextText">No context</span>
            </div>
            <button class="ai-context-manage" id="aiContextManage" title="Manage Context">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2"></path>
              </svg>
            </button>
          </div>

          <!-- Messages Area -->
          <div class="ai-chat-messages" id="aiChatMessages">
            <div class="ai-welcome-message">
              <h3>👋 Welcome to AI Assistant</h3>
              <p>I can help you:</p>
              <ul>
                <li>Generate surveys from natural language</li>
                <li>Optimize existing surveys</li>
                <li>Analyze survey responses</li>
                <li>Answer questions about your data</li>
              </ul>
              <p class="ai-welcome-tip">Try: "Create a customer satisfaction survey with 5 questions"</p>
            </div>
          </div>

          <!-- Typing Indicator -->
          <div class="ai-typing-indicator" id="aiTypingIndicator" style="display: none;">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <!-- Input Area -->
          <div class="ai-chat-input-area">
            <!-- File Upload Preview -->
            <div class="ai-file-preview" id="aiFilePreview" style="display: none;">
              <div class="ai-file-preview-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                  <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                <span id="aiFileName"></span>
              </div>
              <button class="ai-file-remove" id="aiFileRemove">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- Input Controls -->
            <div class="ai-chat-input-controls">
              <button class="ai-file-upload-btn" id="aiFileUploadBtn" title="Upload file">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
              </button>
              <input type="file" id="aiFileInput" style="display: none;" accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json">

              <textarea
                class="ai-chat-input"
                id="aiChatInput"
                placeholder="Ask me anything..."
                rows="1"
              ></textarea>

              <button class="ai-chat-send" id="aiChatSend" title="Send message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>

            <!-- Provider Selector -->
            <div class="ai-provider-selector">
              <label for="aiProviderSelect">AI Provider:</label>
              <select id="aiProviderSelect">
                <option value="openai">OpenAI GPT-4</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="google">Google Gemini</option>
                <option value="local">Local Model</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    `;

    this.addStyles();
  }

  addStyles() {
    if (document.getElementById('aiChatWidgetStyles')) return;

    const styles = document.createElement('style');
    styles.id = 'aiChatWidgetStyles';
    styles.textContent = `
      .ai-chat-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .ai-chat-toggle {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, box-shadow 0.2s;
        position: relative;
      }

      .ai-chat-toggle:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
      }

      .ai-chat-toggle:active {
        transform: scale(0.95);
      }

      .ai-chat-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: white;
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 11px;
        font-weight: bold;
        min-width: 18px;
        text-align: center;
      }

      .ai-chat-window {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 400px;
        height: 600px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: slideUp 0.3s ease-out;
      }

      .ai-chat-window.minimized {
        height: 60px;
        overflow: hidden;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .ai-chat-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .ai-chat-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
      }

      .ai-chat-header-actions {
        display: flex;
        gap: 8px;
      }

      .ai-chat-minimize,
      .ai-chat-close {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .ai-chat-minimize:hover,
      .ai-chat-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .ai-chat-context-bar {
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        padding: 8px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .ai-context-display {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #64748b;
      }

      .ai-context-manage {
        background: none;
        border: none;
        color: #667eea;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .ai-context-manage:hover {
        background: #e0e7ff;
      }

      .ai-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #f8fafc;
      }

      .ai-welcome-message {
        background: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .ai-welcome-message h3 {
        margin: 0 0 12px 0;
        font-size: 18px;
        color: #1e293b;
      }

      .ai-welcome-message p {
        margin: 8px 0;
        color: #64748b;
        font-size: 14px;
      }

      .ai-welcome-message ul {
        margin: 12px 0;
        padding-left: 20px;
        color: #475569;
        font-size: 14px;
      }

      .ai-welcome-message li {
        margin: 6px 0;
      }

      .ai-welcome-tip {
        background: #f1f5f9;
        border-left: 3px solid #667eea;
        padding: 12px;
        border-radius: 4px;
        font-size: 13px !important;
        color: #334155 !important;
        margin-top: 16px !important;
      }

      .ai-message {
        margin-bottom: 16px;
        animation: fadeIn 0.3s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .ai-message.user {
        display: flex;
        justify-content: flex-end;
      }

      .ai-message.assistant {
        display: flex;
        justify-content: flex-start;
      }

      .ai-message-content {
        max-width: 80%;
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.5;
      }

      .ai-message.user .ai-message-content {
        background: #667eea;
        color: white;
        border-bottom-right-radius: 4px;
      }

      .ai-message.assistant .ai-message-content {
        background: white;
        color: #1e293b;
        border-bottom-left-radius: 4px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .ai-message-time {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 4px;
        text-align: right;
      }

      .ai-message.assistant .ai-message-time {
        text-align: left;
      }

      .ai-typing-indicator {
        padding: 12px 16px;
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .ai-typing-indicator span {
        width: 8px;
        height: 8px;
        background: #94a3b8;
        border-radius: 50%;
        animation: typing 1.4s infinite;
      }

      .ai-typing-indicator span:nth-child(2) {
        animation-delay: 0.2s;
      }

      .ai-typing-indicator span:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes typing {
        0%, 60%, 100% {
          transform: translateY(0);
          opacity: 0.4;
        }
        30% {
          transform: translateY(-10px);
          opacity: 1;
        }
      }

      .ai-chat-input-area {
        border-top: 1px solid #e2e8f0;
        background: white;
      }

      .ai-file-preview {
        padding: 8px 16px;
        background: #f1f5f9;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .ai-file-preview-content {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #475569;
      }

      .ai-file-remove {
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

      .ai-file-remove:hover {
        background: #fee2e2;
      }

      .ai-chat-input-controls {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        padding: 12px 16px;
      }

      .ai-file-upload-btn {
        background: none;
        border: none;
        color: #667eea;
        cursor: pointer;
        padding: 8px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
        flex-shrink: 0;
      }

      .ai-file-upload-btn:hover {
        background: #e0e7ff;
      }

      .ai-chat-input {
        flex: 1;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 14px;
        resize: none;
        max-height: 120px;
        font-family: inherit;
        transition: border-color 0.2s;
      }

      .ai-chat-input:focus {
        outline: none;
        border-color: #667eea;
      }

      .ai-chat-send {
        background: #667eea;
        border: none;
        color: white;
        cursor: pointer;
        padding: 10px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
        flex-shrink: 0;
      }

      .ai-chat-send:hover {
        background: #5568d3;
      }

      .ai-chat-send:disabled {
        background: #cbd5e1;
        cursor: not-allowed;
      }

      .ai-provider-selector {
        padding: 8px 16px;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
      }

      .ai-provider-selector label {
        color: #64748b;
        font-weight: 500;
      }

      .ai-provider-selector select {
        flex: 1;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 6px 8px;
        font-size: 12px;
        background: white;
        color: #334155;
        cursor: pointer;
      }

      .ai-provider-selector select:focus {
        outline: none;
        border-color: #667eea;
      }

      @media (max-width: 480px) {
        .ai-chat-window {
          width: calc(100vw - 40px);
          right: 20px;
          height: calc(100vh - 120px);
        }
      }
    `;
    document.head.appendChild(styles);
  }

  attachEventListeners() {
    const toggle = document.getElementById('aiChatToggle');
    const close = document.getElementById('aiChatClose');
    const minimize = document.getElementById('aiChatMinimize');
    const send = document.getElementById('aiChatSend');
    const input = document.getElementById('aiChatInput');
    const fileUploadBtn = document.getElementById('aiFileUploadBtn');
    const fileInput = document.getElementById('aiFileInput');
    const fileRemove = document.getElementById('aiFileRemove');
    const providerSelect = document.getElementById('aiProviderSelect');
    const contextManage = document.getElementById('aiContextManage');

    toggle.addEventListener('click', () => this.toggleChat());
    close.addEventListener('click', () => this.closeChat());
    minimize.addEventListener('click', () => this.minimizeChat());
    send.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    input.addEventListener('input', () => this.autoResizeInput());

    fileUploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    fileRemove.addEventListener('click', () => this.removeFile());

    providerSelect.addEventListener('change', (e) => {
      this.aiService.setProvider(e.target.value);
    });

    contextManage.addEventListener('click', () => this.openContextManager());
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    const window = document.getElementById('aiChatWindow');
    window.style.display = this.isOpen ? 'flex' : 'none';

    if (this.isOpen) {
      document.getElementById('aiChatInput').focus();
    }
  }

  closeChat() {
    this.isOpen = false;
    const window = document.getElementById('aiChatWindow');
    window.style.display = 'none';
  }

  minimizeChat() {
    this.isMinimized = !this.isMinimized;
    const window = document.getElementById('aiChatWindow');
    window.classList.toggle('minimized', this.isMinimized);
  }

  autoResizeInput() {
    const input = document.getElementById('aiChatInput');
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }

  async sendMessage() {
    const input = document.getElementById('aiChatInput');
    const message = input.value.trim();

    if (!message && !this.selectedFile) return;

    const send = document.getElementById('aiChatSend');
    send.disabled = true;

    // Add user message
    if (message) {
      this.addMessage('user', message);
      input.value = '';
      input.style.height = 'auto';
    }

    // Show typing indicator
    this.showTypingIndicator();

    try {
      // If file is attached, upload it first
      if (this.selectedFile) {
        await this.aiService.uploadContextFile(this.selectedFile);
        this.removeFile();
      }

      // Send message to AI
      const response = await this.aiService.chat(message);

      this.hideTypingIndicator();
      this.addMessage('assistant', response.message || response.response || 'I apologize, I could not generate a response.');
    } catch (error) {
      this.hideTypingIndicator();
      this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
      console.error('Chat error:', error);
    } finally {
      send.disabled = false;
      input.focus();
    }
  }

  addMessage(role, content) {
    const messagesContainer = document.getElementById('aiChatMessages');

    // Remove welcome message if it exists
    const welcome = messagesContainer.querySelector('.ai-welcome-message');
    if (welcome) {
      welcome.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${role}`;

    const time = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    messageDiv.innerHTML = `
      <div class="ai-message-content">
        ${this.formatMessage(content)}
        <div class="ai-message-time">${time}</div>
      </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  formatMessage(content) {
    // Basic markdown-like formatting
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    return formatted;
  }

  showTypingIndicator() {
    document.getElementById('aiTypingIndicator').style.display = 'flex';
    const messagesContainer = document.getElementById('aiChatMessages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  hideTypingIndicator() {
    document.getElementById('aiTypingIndicator').style.display = 'none';
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      document.getElementById('aiFileName').textContent = file.name;
      document.getElementById('aiFilePreview').style.display = 'flex';
    }
  }

  removeFile() {
    this.selectedFile = null;
    document.getElementById('aiFilePreview').style.display = 'none';
    document.getElementById('aiFileInput').value = '';
  }

  updateContextDisplay(text) {
    document.getElementById('aiContextText').textContent = text || 'No context';
  }

  openContextManager() {
    // This will be implemented in context-manager.js
    if (window.contextManager) {
      window.contextManager.open();
    }
  }

  setBadgeCount(count) {
    const badge = document.getElementById('aiChatBadge');
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIChatWidget;
}
