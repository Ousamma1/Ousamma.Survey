/**
 * Survey Distribution Management
 * Handles unique links, QR codes, embed codes, email/social distribution
 */

const API_BASE = window.location.origin;
const SURVEY_SERVICE_URL = `${API_BASE}:3004/api/surveys`;

let currentSurvey = null;
let distributionLinks = [];
let qrCodes = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadSurveys();
});

// Load available surveys
async function loadSurveys() {
    try {
        const response = await fetch(`${SURVEY_SERVICE_URL}?status=active,draft`);
        const data = await response.json();

        const select = document.getElementById('survey-select');
        select.innerHTML = '<option value="">-- Select a Survey --</option>';

        if (data.success && data.data) {
            data.data.forEach(survey => {
                const option = document.createElement('option');
                option.value = survey.surveyId;
                option.textContent = survey.title.get ? survey.title.get('en') : survey.title;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading surveys:', error);
        alert('Error loading surveys. Please try again.');
    }
}

// Load selected survey
async function loadSurvey() {
    const surveyId = document.getElementById('survey-select').value;

    if (!surveyId) {
        document.getElementById('distribution-panel').style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`${SURVEY_SERVICE_URL}/${surveyId}`);
        const data = await response.json();

        if (data.success) {
            currentSurvey = data.data;
            distributionLinks = currentSurvey.distribution?.uniqueLinks || [];
            qrCodes = currentSurvey.distribution?.qrCodes || [];

            document.getElementById('distribution-panel').style.display = 'block';

            // Update all tabs with current data
            updateLinksTab();
            updateQRTab();
            updateSocialTab();
            updateSettingsTab();
        }
    } catch (error) {
        console.error('Error loading survey:', error);
        alert('Error loading survey details. Please try again.');
    }
}

// Tab switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// UNIQUE LINKS TAB

async function createLink() {
    const label = document.getElementById('link-label').value;
    const maxUses = document.getElementById('link-max-uses').value;
    const expires = document.getElementById('link-expires').value;

    if (!label) {
        alert('Please enter a link label');
        return;
    }

    try {
        const response = await fetch(`${SURVEY_SERVICE_URL}/${currentSurvey.surveyId}/distribution/link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                label,
                maxUses: maxUses ? parseInt(maxUses) : undefined,
                expiresAt: expires ? new Date(expires).toISOString() : undefined
            })
        });

        const data = await response.json();

        if (data.success) {
            distributionLinks.push(data.data);
            updateLinksTab();

            // Clear form
            document.getElementById('link-label').value = '';
            document.getElementById('link-max-uses').value = '';
            document.getElementById('link-expires').value = '';

            alert('Link created successfully!');
        }
    } catch (error) {
        console.error('Error creating link:', error);
        alert('Error creating link. Please try again.');
    }
}

function updateLinksTab() {
    const linksList = document.getElementById('links-list');
    const qrLinkSelect = document.getElementById('qr-link-select');
    const emailLinkSelect = document.getElementById('email-link-select');

    // Update links list
    if (distributionLinks.length === 0) {
        linksList.innerHTML = '<li style="padding: 20px; text-align: center; color: #666;">No links created yet</li>';
    } else {
        linksList.innerHTML = distributionLinks.map(link => `
            <li class="link-item">
                <div class="link-info">
                    <div class="link-label">${link.label}</div>
                    <div class="link-url">${link.url || `${API_BASE}/survey/${currentSurvey.surveyId}?link=${link.code}`}</div>
                    <div class="link-stats">
                        Used: ${link.usedCount || 0}${link.maxUses ? ` / ${link.maxUses}` : ''}
                        ${link.expiresAt ? ` | Expires: ${new Date(link.expiresAt).toLocaleDateString()}` : ''}
                    </div>
                </div>
                <div class="link-actions">
                    <button class="btn btn-secondary btn-small" onclick="copyLink('${link.code}')">Copy</button>
                    <button class="btn btn-secondary btn-small" onclick="deleteLink('${link.linkId}')">Delete</button>
                </div>
            </li>
        `).join('');
    }

    // Update select dropdowns
    const linkOptions = distributionLinks.map(link =>
        `<option value="${link.linkId}">${link.label}</option>`
    ).join('');

    qrLinkSelect.innerHTML = '<option value="">Default Survey URL</option>' + linkOptions;
    emailLinkSelect.innerHTML = '<option value="">Default Survey URL</option>' + linkOptions;
}

function copyLink(code) {
    const url = `${API_BASE}/survey/${currentSurvey.surveyId}?link=${code}`;
    navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard!');
    });
}

async function deleteLink(linkId) {
    if (!confirm('Are you sure you want to delete this link?')) return;

    // Remove from local array (in production, make API call)
    distributionLinks = distributionLinks.filter(l => l.linkId !== linkId);
    updateLinksTab();
}

// QR CODES TAB

async function generateQRCode() {
    const linkId = document.getElementById('qr-link-select').value;
    const size = document.getElementById('qr-size').value;

    try {
        const response = await fetch(`${SURVEY_SERVICE_URL}/${currentSurvey.surveyId}/distribution/qrcode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ linkId: linkId || undefined, size: parseInt(size) })
        });

        const data = await response.json();

        if (data.success) {
            qrCodes.push(data.data);
            updateQRTab();
            alert('QR code generated successfully!');
        }
    } catch (error) {
        console.error('Error generating QR code:', error);
        alert('Error generating QR code. Please try again.');
    }
}

function updateQRTab() {
    const qrGrid = document.getElementById('qr-grid');

    if (qrCodes.length === 0) {
        qrGrid.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No QR codes generated yet</div>';
    } else {
        qrGrid.innerHTML = qrCodes.map(qr => {
            const link = distributionLinks.find(l => l.linkId === qr.linkId);
            return `
                <div class="qr-card">
                    <h4>${link ? link.label : 'Default URL'}</h4>
                    <img src="${qr.imageUrl}" alt="QR Code">
                    <button class="btn btn-secondary btn-small" onclick="downloadQR('${qr.imageUrl}', '${qr.qrCodeId}')">Download</button>
                </div>
            `;
        }).join('');
    }
}

function downloadQR(dataUrl, qrCodeId) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `qr-code-${qrCodeId}.png`;
    link.click();
}

// EMBED TAB

async function generateEmbed() {
    const width = document.getElementById('embed-width').value;
    const height = document.getElementById('embed-height').value;
    const theme = document.getElementById('embed-theme').value;

    try {
        const response = await fetch(`${SURVEY_SERVICE_URL}/${currentSurvey.surveyId}/distribution/embed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ width, height, theme })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('iframe-code').textContent = data.data.iframeCode;
            document.getElementById('script-code').textContent = data.data.scriptCode;
            document.getElementById('embed-result').style.display = 'block';
        }
    } catch (error) {
        console.error('Error generating embed code:', error);
        alert('Error generating embed code. Please try again.');
    }
}

// EMAIL TAB

function sendEmail() {
    const recipients = document.getElementById('email-recipients').value.split(',').map(e => e.trim());
    const subject = document.getElementById('email-subject').value;
    const message = document.getElementById('email-message').value;
    const linkId = document.getElementById('email-link-select').value;

    if (recipients.length === 0 || !subject || !message) {
        alert('Please fill in all required fields');
        return;
    }

    const link = linkId ? distributionLinks.find(l => l.linkId === linkId) : null;
    const surveyUrl = link ?
        `${API_BASE}/survey/${currentSurvey.surveyId}?link=${link.code}` :
        `${API_BASE}/survey/${currentSurvey.surveyId}`;

    const emailBody = `${message}\n\nClick here to participate: ${surveyUrl}`;

    // Preview email
    document.getElementById('email-preview').innerHTML = `
        <p><strong>To:</strong> ${recipients.join(', ')}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <div style="white-space: pre-wrap;">${emailBody}</div>
    `;

    // In production, this would call your email service
    alert('Email preview generated. In production, this would send actual emails.');

    // For now, open default email client
    const mailto = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailto);
}

// SOCIAL MEDIA TAB

function updateSocialTab() {
    const surveyUrl = currentSurvey.settings?.customSlug ?
        `${API_BASE}/s/${currentSurvey.settings.customSlug}` :
        `${API_BASE}/survey/${currentSurvey.surveyId}`;

    document.getElementById('social-url').value = surveyUrl;

    const shareButtons = document.getElementById('share-buttons');
    const message = document.getElementById('social-message').value || 'Please participate in our survey!';
    const encodedMessage = encodeURIComponent(message);
    const encodedUrl = encodeURIComponent(surveyUrl);

    shareButtons.innerHTML = `
        <a href="mailto:?subject=${encodedMessage}&body=${encodedMessage}%0A%0A${encodedUrl}"
           class="share-btn share-btn-email" target="_blank">
            ✉️ Email
        </a>
        <a href="https://wa.me/?text=${encodedMessage}%20${encodedUrl}"
           class="share-btn share-btn-whatsapp" target="_blank">
            📱 WhatsApp
        </a>
        <a href="https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}"
           class="share-btn share-btn-telegram" target="_blank">
            ✈️ Telegram
        </a>
        <a href="sms:?body=${encodedMessage}%20${encodedUrl}"
           class="share-btn share-btn-sms">
            💬 SMS
        </a>
        <a href="https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}"
           class="share-btn" style="background: #1DA1F2;" target="_blank">
            🐦 Twitter
        </a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}"
           class="share-btn" style="background: #4267B2;" target="_blank">
            📘 Facebook
        </a>
        <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}"
           class="share-btn" style="background: #0077B5;" target="_blank">
            💼 LinkedIn
        </a>
        <button class="share-btn" style="background: #667eea;" onclick="copyToClipboard('social-url')">
            🔗 Copy Link
        </button>
    `;
}

// SETTINGS TAB

function updateSettingsTab() {
    if (currentSurvey.settings) {
        document.getElementById('require-access-code').checked = currentSurvey.settings.requireAccessCode || false;
        document.getElementById('access-codes').value = (currentSurvey.settings.accessCodes || []).join('\n');
        document.getElementById('custom-slug').value = currentSurvey.settings.customSlug || '';
        document.getElementById('max-responses').value = currentSurvey.settings.maxResponses || '';
        document.getElementById('max-responses-per-user').value = currentSurvey.settings.maxResponsesPerUser || 1;
        document.getElementById('allow-anonymous').checked = currentSurvey.settings.allowAnonymous || false;

        if (currentSurvey.settings.startDate) {
            document.getElementById('start-date').value = new Date(currentSurvey.settings.startDate).toISOString().slice(0, 16);
        }

        if (currentSurvey.settings.endDate) {
            document.getElementById('end-date').value = new Date(currentSurvey.settings.endDate).toISOString().slice(0, 16);
        }

        toggleAccessCode();
    }
}

function toggleAccessCode() {
    const requireCode = document.getElementById('require-access-code').checked;
    document.getElementById('access-codes-group').style.display = requireCode ? 'block' : 'none';
}

async function saveSettings() {
    const settings = {
        requireAccessCode: document.getElementById('require-access-code').checked,
        accessCodes: document.getElementById('access-codes').value.split('\n').filter(c => c.trim()),
        customSlug: document.getElementById('custom-slug').value.trim(),
        startDate: document.getElementById('start-date').value ? new Date(document.getElementById('start-date').value).toISOString() : null,
        endDate: document.getElementById('end-date').value ? new Date(document.getElementById('end-date').value).toISOString() : null,
        maxResponses: document.getElementById('max-responses').value ? parseInt(document.getElementById('max-responses').value) : null,
        maxResponsesPerUser: parseInt(document.getElementById('max-responses-per-user').value) || 1,
        allowAnonymous: document.getElementById('allow-anonymous').checked
    };

    try {
        const response = await fetch(`${SURVEY_SERVICE_URL}/${currentSurvey.surveyId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings })
        });

        const data = await response.json();

        if (data.success) {
            alert('Settings saved successfully!');
            await loadSurvey(); // Reload to get updated data
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings. Please try again.');
    }
}

// UTILITIES

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent || element.value;

    navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
    }).catch(err => {
        console.error('Error copying to clipboard:', err);
    });
}

// Update social message on input
document.addEventListener('DOMContentLoaded', () => {
    const socialMessage = document.getElementById('social-message');
    if (socialMessage) {
        socialMessage.addEventListener('input', () => {
            if (currentSurvey) {
                updateSocialTab();
            }
        });
    }
});
