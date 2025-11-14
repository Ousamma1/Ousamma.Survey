/**
 * Survey Sections Component - Collapsible sections with animations
 * Features: auto-collapse, progress tracking, auto-scroll, visual indicators
 */

class SurveySections {
  constructor(options = {}) {
    this.survey = options.survey;
    this.container = options.container;
    this.language = options.language || 'en';
    this.isRTL = ['ar', 'he', 'fa', 'ur'].includes(this.language);
    this.responses = {};
    this.currentSectionIndex = 0;
    this.sectionStates = new Map(); // Track completion state

    this.onProgressUpdate = options.onProgressUpdate || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onSave = options.onSave || (() => {});

    this.init();
  }

  init() {
    if (!this.container) {
      console.error('Container element is required');
      return;
    }

    this.container.innerHTML = '';
    this.container.className = `survey-sections ${this.isRTL ? 'rtl' : 'ltr'}`;

    // Add progress bar if enabled
    if (this.survey.settings?.showProgressBar) {
      this.renderProgressBar();
    }

    // Render sections
    this.renderSections();

    // Auto-scroll to current section
    this.scrollToCurrentSection();
  }

  renderProgressBar() {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'survey-progress-container';
    progressContainer.innerHTML = `
      <div class="survey-progress">
        <div class="survey-progress-bar" id="survey-progress-bar" style="width: 0%"></div>
      </div>
      <div class="survey-progress-text" id="survey-progress-text">0%</div>
    `;
    this.container.appendChild(progressContainer);
  }

  renderSections() {
    const sectionsContainer = document.createElement('div');
    sectionsContainer.className = 'sections-container';

    if (!this.survey.sections || this.survey.sections.length === 0) {
      // No sections - render all questions
      this.renderQuestionsWithoutSections(sectionsContainer);
    } else {
      // Render sections
      this.survey.sections.forEach((section, index) => {
        const sectionElement = this.renderSection(section, index);
        sectionsContainer.appendChild(sectionElement);
      });
    }

    this.container.appendChild(sectionsContainer);

    // Add navigation buttons
    this.renderNavigation();
  }

  renderSection(section, index) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'survey-section';
    sectionDiv.id = `section-${section.sectionId}`;
    sectionDiv.dataset.sectionIndex = index;

    const isExpanded = section.collapsible?.defaultExpanded || index === this.currentSectionIndex;
    const isCompleted = this.isSectionCompleted(section);

    sectionDiv.innerHTML = `
      <div class="section-header ${isCompleted ? 'completed' : ''}"
           onclick="surveySections.toggleSection('${section.sectionId}')">
        <div class="section-header-content">
          <div class="section-title">
            <span class="section-number">${index + 1}</span>
            <h3>${section.title.get(this.language) || section.title.get('en')}</h3>
          </div>
          ${section.description ? `
            <p class="section-description">${section.description.get(this.language) || section.description.get('en')}</p>
          ` : ''}
        </div>
        <div class="section-indicators">
          ${isCompleted ? '<span class="completion-indicator">✓</span>' : ''}
          <span class="collapse-indicator ${isExpanded ? 'expanded' : 'collapsed'}">▼</span>
        </div>
      </div>
      <div class="section-content ${isExpanded ? 'expanded' : 'collapsed'}"
           id="section-content-${section.sectionId}">
        <div class="section-questions" id="section-questions-${section.sectionId}">
          ${this.renderSectionQuestions(section)}
        </div>
      </div>
    `;

    return sectionDiv;
  }

  renderSectionQuestions(section) {
    const questions = this.survey.questions.filter(q =>
      section.questionIds.includes(q.questionId)
    );

    return questions.map(question => this.renderQuestion(question)).join('');
  }

  renderQuestion(question) {
    // Check conditional logic
    const logicResult = this.evaluateConditionalLogic(question);
    if (!logicResult.visible) {
      return ''; // Hide question
    }

    const text = this.applyPiping(question);
    const isRequired = question.required;
    const currentValue = this.responses[question.questionId];

    let questionHTML = `
      <div class="survey-question ${currentValue ? 'answered' : ''}"
           id="question-${question.questionId}"
           data-question-id="${question.questionId}"
           data-required="${isRequired}">
        <div class="question-header">
          <label class="question-text">
            ${text}
            ${isRequired ? '<span class="required-indicator">*</span>' : ''}
          </label>
        </div>
        <div class="question-input">
    `;

    switch (question.type) {
      case 'multiple_choice':
        questionHTML += this.renderMultipleChoice(question, currentValue);
        break;
      case 'checkboxes':
        questionHTML += this.renderCheckboxes(question, currentValue);
        break;
      case 'dropdown':
        questionHTML += this.renderDropdown(question, currentValue);
        break;
      case 'short_answer':
        questionHTML += this.renderShortAnswer(question, currentValue);
        break;
      case 'paragraph':
        questionHTML += this.renderParagraph(question, currentValue);
        break;
      case 'scale':
        questionHTML += this.renderScale(question, currentValue);
        break;
      case 'file_upload':
        questionHTML += this.renderFileUpload(question, currentValue);
        break;
      case 'signature':
        questionHTML += this.renderSignature(question, currentValue);
        break;
      case 'location':
        questionHTML += this.renderLocation(question, currentValue);
        break;
      default:
        questionHTML += `<p>Unsupported question type: ${question.type}</p>`;
    }

    questionHTML += `
        </div>
        <div class="question-validation-error" id="error-${question.questionId}"></div>
      </div>
    `;

    return questionHTML;
  }

  renderMultipleChoice(question, currentValue) {
    const options = question.options?.get(this.language) || question.options?.get('en') || [];
    return options.map(option => `
      <label class="radio-option">
        <input type="radio"
               name="${question.questionId}"
               value="${option}"
               ${currentValue === option ? 'checked' : ''}
               onchange="surveySections.handleAnswer('${question.questionId}', this.value)">
        <span>${option}</span>
      </label>
    `).join('');
  }

  renderCheckboxes(question, currentValue) {
    const options = question.options?.get(this.language) || question.options?.get('en') || [];
    const selectedValues = Array.isArray(currentValue) ? currentValue : [];

    return options.map(option => `
      <label class="checkbox-option">
        <input type="checkbox"
               name="${question.questionId}"
               value="${option}"
               ${selectedValues.includes(option) ? 'checked' : ''}
               onchange="surveySections.handleCheckboxAnswer('${question.questionId}', this.value, this.checked)">
        <span>${option}</span>
      </label>
    `).join('');
  }

  renderDropdown(question, currentValue) {
    const options = question.options?.get(this.language) || question.options?.get('en') || [];
    return `
      <select name="${question.questionId}"
              onchange="surveySections.handleAnswer('${question.questionId}', this.value)">
        <option value="">-- Select an option --</option>
        ${options.map(option => `
          <option value="${option}" ${currentValue === option ? 'selected' : ''}>${option}</option>
        `).join('')}
      </select>
    `;
  }

  renderShortAnswer(question, currentValue) {
    return `
      <input type="text"
             name="${question.questionId}"
             value="${currentValue || ''}"
             placeholder="${this.getTranslation('enter_answer')}"
             onchange="surveySections.handleAnswer('${question.questionId}', this.value)">
    `;
  }

  renderParagraph(question, currentValue) {
    return `
      <textarea name="${question.questionId}"
                rows="4"
                placeholder="${this.getTranslation('enter_answer')}"
                onchange="surveySections.handleAnswer('${question.questionId}', this.value)">${currentValue || ''}</textarea>
    `;
  }

  renderScale(question, currentValue) {
    const settings = question.scaleSettings || { min: 1, max: 5, step: 1 };
    const minLabel = settings.minLabel?.get(this.language) || settings.min;
    const maxLabel = settings.maxLabel?.get(this.language) || settings.max;

    return `
      <div class="scale-container">
        <span class="scale-label">${minLabel}</span>
        <input type="range"
               name="${question.questionId}"
               min="${settings.min}"
               max="${settings.max}"
               step="${settings.step}"
               value="${currentValue || settings.min}"
               oninput="surveySections.handleAnswer('${question.questionId}', this.value); document.getElementById('scale-value-${question.questionId}').textContent = this.value">
        <span class="scale-label">${maxLabel}</span>
        <div class="scale-value" id="scale-value-${question.questionId}">${currentValue || settings.min}</div>
      </div>
    `;
  }

  renderFileUpload(question, currentValue) {
    const settings = question.fileUpload || { maxFiles: 1 };
    return `
      <div class="file-upload-container">
        <input type="file"
               id="file-${question.questionId}"
               name="${question.questionId}"
               ${settings.maxFiles > 1 ? 'multiple' : ''}
               accept="${settings.allowedTypes?.join(',') || '*'}"
               onchange="surveySections.handleFileUpload('${question.questionId}', this.files)">
        <label for="file-${question.questionId}" class="file-upload-label">
          📎 ${this.getTranslation('choose_file')}
        </label>
        <div class="file-list" id="file-list-${question.questionId}"></div>
      </div>
    `;
  }

  renderSignature(question, currentValue) {
    return `
      <div class="signature-container">
        <canvas id="signature-${question.questionId}"
                width="400"
                height="200"
                style="border: 1px solid #ccc; cursor: crosshair;"></canvas>
        <div class="signature-buttons">
          <button type="button" onclick="surveySections.clearSignature('${question.questionId}')">
            ${this.getTranslation('clear')}
          </button>
        </div>
      </div>
    `;
  }

  renderLocation(question, currentValue) {
    return `
      <div class="location-container">
        <button type="button" onclick="surveySections.captureLocation('${question.questionId}')">
          📍 ${this.getTranslation('capture_location')}
        </button>
        <div class="location-display" id="location-${question.questionId}">
          ${currentValue ? `Location captured: ${currentValue.formatted || 'Available'}` : ''}
        </div>
      </div>
    `;
  }

  renderQuestionsWithoutSections(container) {
    const questionsDiv = document.createElement('div');
    questionsDiv.className = 'questions-no-sections';
    questionsDiv.innerHTML = this.survey.questions.map(q => this.renderQuestion(q)).join('');
    container.appendChild(questionsDiv);
  }

  renderNavigation() {
    const navDiv = document.createElement('div');
    navDiv.className = 'survey-navigation';
    navDiv.innerHTML = `
      <button type="button"
              class="btn-secondary"
              id="btn-previous"
              onclick="surveySections.previousSection()"
              ${this.currentSectionIndex === 0 ? 'disabled' : ''}>
        ${this.getTranslation('previous')}
      </button>

      ${this.survey.settings?.allowSaveResume ? `
        <button type="button"
                class="btn-outline"
                onclick="surveySections.saveProgress()">
          ${this.getTranslation('save_progress')}
        </button>
      ` : ''}

      <button type="button"
              class="btn-primary"
              id="btn-next"
              onclick="surveySections.nextSection()">
        ${this.isLastSection() ? this.getTranslation('submit') : this.getTranslation('next')}
      </button>
    `;
    this.container.appendChild(navDiv);
  }

  // Event Handlers

  handleAnswer(questionId, value) {
    this.responses[questionId] = value;
    this.updateProgress();
    this.updateQuestionState(questionId);
    this.reEvaluateConditionalLogic();
  }

  handleCheckboxAnswer(questionId, value, checked) {
    if (!this.responses[questionId]) {
      this.responses[questionId] = [];
    }

    if (checked) {
      if (!this.responses[questionId].includes(value)) {
        this.responses[questionId].push(value);
      }
    } else {
      this.responses[questionId] = this.responses[questionId].filter(v => v !== value);
    }

    this.updateProgress();
    this.updateQuestionState(questionId);
    this.reEvaluateConditionalLogic();
  }

  async handleFileUpload(questionId, files) {
    // Handle file upload logic here
    // For now, store file references
    this.responses[questionId] = Array.from(files).map(f => ({
      name: f.name,
      size: f.size,
      type: f.type
    }));

    this.updateProgress();
    this.updateQuestionState(questionId);
  }

  clearSignature(questionId) {
    const canvas = document.getElementById(`signature-${questionId}`);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    delete this.responses[questionId];
    this.updateProgress();
  }

  async captureLocation(questionId) {
    if (!navigator.geolocation) {
      alert(this.getTranslation('location_not_supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.responses[questionId] = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          formatted: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
        };

        document.getElementById(`location-${questionId}`).innerHTML =
          `Location captured: ${this.responses[questionId].formatted}`;

        this.updateProgress();
        this.updateQuestionState(questionId);
      },
      (error) => {
        alert(this.getTranslation('location_error'));
        console.error('Location error:', error);
      }
    );
  }

  toggleSection(sectionId) {
    const content = document.getElementById(`section-content-${sectionId}`);
    const indicator = content.parentElement.querySelector('.collapse-indicator');

    if (content.classList.contains('expanded')) {
      content.classList.remove('expanded');
      content.classList.add('collapsed');
      indicator.classList.remove('expanded');
      indicator.classList.add('collapsed');
    } else {
      content.classList.remove('collapsed');
      content.classList.add('expanded');
      indicator.classList.remove('collapsed');
      indicator.classList.add('expanded');
    }
  }

  async nextSection() {
    // Validate current section
    if (!this.validateCurrentSection()) {
      return;
    }

    if (this.isLastSection()) {
      await this.submitSurvey();
    } else {
      // Auto-collapse current section if enabled
      const currentSection = this.survey.sections[this.currentSectionIndex];
      if (currentSection?.collapsible?.autoCollapse) {
        this.toggleSection(currentSection.sectionId);
      }

      this.currentSectionIndex++;
      this.updateNavigation();
      this.scrollToCurrentSection();

      // Auto-expand next section
      const nextSection = this.survey.sections[this.currentSectionIndex];
      if (nextSection) {
        const content = document.getElementById(`section-content-${nextSection.sectionId}`);
        if (!content.classList.contains('expanded')) {
          this.toggleSection(nextSection.sectionId);
        }
      }
    }
  }

  previousSection() {
    if (this.currentSectionIndex > 0) {
      this.currentSectionIndex--;
      this.updateNavigation();
      this.scrollToCurrentSection();
    }
  }

  async saveProgress() {
    try {
      const saveToken = await this.onSave(this.responses, {
        currentSectionIndex: this.currentSectionIndex,
        progress: this.calculateProgress()
      });

      alert(this.getTranslation('progress_saved'));

      // Store save token in localStorage
      if (saveToken) {
        localStorage.setItem(`survey_save_${this.survey.surveyId}`, saveToken);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      alert(this.getTranslation('save_error'));
    }
  }

  async submitSurvey() {
    if (!this.validateAllSections()) {
      return;
    }

    try {
      await this.onComplete(this.responses);

      // Clear save token
      localStorage.removeItem(`survey_save_${this.survey.surveyId}`);
    } catch (error) {
      console.error('Error submitting survey:', error);
      alert(this.getTranslation('submit_error'));
    }
  }

  // Helper Methods

  validateCurrentSection() {
    if (!this.survey.sections || this.survey.sections.length === 0) {
      return this.validateAllQuestions();
    }

    const section = this.survey.sections[this.currentSectionIndex];
    const questions = this.survey.questions.filter(q =>
      section.questionIds.includes(q.questionId)
    );

    return this.validateQuestions(questions);
  }

  validateAllSections() {
    return this.validateQuestions(this.survey.questions);
  }

  validateQuestions(questions) {
    let isValid = true;

    for (const question of questions) {
      const logicResult = this.evaluateConditionalLogic(question);
      if (!logicResult.visible) continue;

      const answer = this.responses[question.questionId];

      if (question.required && !answer) {
        this.showValidationError(question.questionId, this.getTranslation('required_field'));
        isValid = false;
      }

      // Additional validation
      if (answer && question.validation) {
        const validationError = this.validateAnswer(question, answer);
        if (validationError) {
          this.showValidationError(question.questionId, validationError);
          isValid = false;
        }
      }
    }

    return isValid;
  }

  validateAnswer(question, answer) {
    const val = question.validation;

    if (val.minLength && String(answer).length < val.minLength) {
      return val.customMessage?.get(this.language) || `Minimum length is ${val.minLength}`;
    }

    if (val.maxLength && String(answer).length > val.maxLength) {
      return val.customMessage?.get(this.language) || `Maximum length is ${val.maxLength}`;
    }

    if (val.pattern && !new RegExp(val.pattern).test(String(answer))) {
      return val.customMessage?.get(this.language) || 'Invalid format';
    }

    return null;
  }

  showValidationError(questionId, message) {
    const errorDiv = document.getElementById(`error-${questionId}`);
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';

      // Scroll to error
      const questionDiv = document.getElementById(`question-${questionId}`);
      if (questionDiv) {
        questionDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  clearValidationError(questionId) {
    const errorDiv = document.getElementById(`error-${questionId}`);
    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
    }
  }

  updateQuestionState(questionId) {
    const questionDiv = document.getElementById(`question-${questionId}`);
    if (questionDiv) {
      questionDiv.classList.add('answered');
      this.clearValidationError(questionId);
    }
  }

  isSectionCompleted(section) {
    const questions = this.survey.questions.filter(q =>
      section.questionIds.includes(q.questionId)
    );

    return questions.every(q => {
      const logicResult = this.evaluateConditionalLogic(q);
      if (!logicResult.visible) return true;
      return this.responses[q.questionId] !== undefined;
    });
  }

  isLastSection() {
    return this.currentSectionIndex >= (this.survey.sections?.length || 1) - 1;
  }

  updateNavigation() {
    const prevBtn = document.getElementById('btn-previous');
    const nextBtn = document.getElementById('btn-next');

    if (prevBtn) {
      prevBtn.disabled = this.currentSectionIndex === 0;
    }

    if (nextBtn) {
      nextBtn.textContent = this.isLastSection() ?
        this.getTranslation('submit') :
        this.getTranslation('next');
    }
  }

  scrollToCurrentSection() {
    if (this.survey.settings?.autoScrollToNext) {
      const section = this.survey.sections?.[this.currentSectionIndex];
      if (section) {
        const sectionElement = document.getElementById(`section-${section.sectionId}`);
        if (sectionElement) {
          sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }

  calculateProgress() {
    const totalQuestions = this.survey.questions.length;
    const answeredQuestions = Object.keys(this.responses).length;
    return Math.round((answeredQuestions / totalQuestions) * 100);
  }

  updateProgress() {
    const progress = this.calculateProgress();

    const progressBar = document.getElementById('survey-progress-bar');
    const progressText = document.getElementById('survey-progress-text');

    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    if (progressText) {
      progressText.textContent = `${progress}%`;
    }

    this.onProgressUpdate(progress, this.responses);
  }

  evaluateConditionalLogic(question) {
    if (!question.conditionalLogic?.enabled) {
      return { visible: true };
    }

    for (const rule of question.conditionalLogic.rules) {
      const triggerAnswer = this.responses[rule.trigger.questionId];
      const conditionMet = this.checkCondition(triggerAnswer, rule.trigger.operator, rule.trigger.value);

      if (conditionMet) {
        return {
          visible: rule.condition !== 'hide',
          action: rule.action
        };
      }
    }

    return { visible: true };
  }

  checkCondition(answer, operator, value) {
    switch (operator) {
      case 'equals': return answer === value;
      case 'not_equals': return answer !== value;
      case 'contains': return Array.isArray(answer) ? answer.includes(value) : String(answer).includes(value);
      case 'not_contains': return Array.isArray(answer) ? !answer.includes(value) : !String(answer).includes(value);
      case 'greater_than': return Number(answer) > Number(value);
      case 'less_than': return Number(answer) < Number(value);
      case 'is_empty': return !answer || answer.length === 0;
      case 'is_not_empty': return answer && answer.length > 0;
      default: return false;
    }
  }

  reEvaluateConditionalLogic() {
    this.survey.questions.forEach(question => {
      const logicResult = this.evaluateConditionalLogic(question);
      const questionDiv = document.getElementById(`question-${question.questionId}`);

      if (questionDiv) {
        questionDiv.style.display = logicResult.visible ? 'block' : 'none';
      }
    });
  }

  applyPiping(question) {
    if (!question.piping?.enabled) {
      return question.text.get(this.language) || question.text.get('en');
    }

    let text = question.piping.template || question.text.get(this.language);

    for (const source of question.piping.sources) {
      const answer = this.responses[source.questionId];
      const placeholder = source.placeholder || `{{${source.questionId}}}`;
      text = text.replace(new RegExp(placeholder, 'g'), answer || '');
    }

    return text;
  }

  getTranslation(key) {
    const translations = {
      en: {
        enter_answer: 'Enter your answer',
        choose_file: 'Choose File',
        clear: 'Clear',
        capture_location: 'Capture Location',
        previous: 'Previous',
        next: 'Next',
        submit: 'Submit',
        save_progress: 'Save Progress',
        required_field: 'This field is required',
        progress_saved: 'Progress saved successfully!',
        save_error: 'Error saving progress. Please try again.',
        submit_error: 'Error submitting survey. Please try again.',
        location_not_supported: 'Geolocation is not supported by your browser',
        location_error: 'Unable to retrieve your location'
      },
      ar: {
        enter_answer: 'أدخل إجابتك',
        choose_file: 'اختر ملف',
        clear: 'مسح',
        capture_location: 'التقاط الموقع',
        previous: 'السابق',
        next: 'التالي',
        submit: 'إرسال',
        save_progress: 'حفظ التقدم',
        required_field: 'هذا الحقل مطلوب',
        progress_saved: 'تم حفظ التقدم بنجاح!',
        save_error: 'خطأ في حفظ التقدم. يرجى المحاولة مرة أخرى.',
        submit_error: 'خطأ في إرسال الاستبيان. يرجى المحاولة مرة أخرى.',
        location_not_supported: 'المتصفح الخاص بك لا يدعم تحديد الموقع الجغرافي',
        location_error: 'تعذر الحصول على موقعك'
      }
    };

    return translations[this.language]?.[key] || translations.en[key] || key;
  }
}

// Make globally accessible
let surveySections;

// Initialize from window for onclick handlers
window.surveySections = null;
