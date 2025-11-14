# Survey Creator Guide

Complete guide for creating and managing surveys in the Ousamma Survey System.

## Quick Start

1. **Access Survey Builder**: Navigate to `/survey-builder.html`
2. **Choose Method**:
   - AI-Powered Generation (Recommended for beginners)
   - Manual Creation (Full control)
   - Template Library (Quick start)

---

## AI-Powered Survey Generation

### Step 1: Describe Your Survey

```
Example Description:
"Create a customer satisfaction survey for a retail clothing store.
Include questions about product quality, staff helpfulness, store
cleanliness, pricing, and overall experience. Target 10-12 questions
with a mix of rating scales and open-ended feedback."
```

### Step 2: Configure Options

- **Language**: English, Arabic, French, etc.
- **Question Count**: 5-50 questions
- **Target Audience**: Customers, Employees, General Public
- **Survey Length**: Short (3-5 min), Medium (5-10 min), Long (10+ min)

### Step 3: Review & Customize

AI generates survey with:
- Optimized question order
- Appropriate question types
- Skip logic (if applicable)
- Response validation

**Customization Options:**
- Edit question wording
- Change question types
- Adjust validation rules
- Add conditional logic

### Step 4: Get AI Suggestions

Click "Optimize Survey" for:
- Question clarity improvements
- Better response options
- Survey flow enhancements
- Bias detection

---

## Manual Survey Creation

### Creating Questions

#### Text Input
```javascript
{
  "type": "text",
  "text": "What is your full name?",
  "required": true,
  "validation": {
    "minLength": 2,
    "maxLength": 100
  }
}
```

#### Email
```javascript
{
  "type": "email",
  "text": "Please provide your email address",
  "required": true,
  "placeholder": "email@example.com"
}
```

#### Rating Scale
```javascript
{
  "type": "rating",
  "text": "How satisfied are you with our service?",
  "scale": 5,
  "labels": {
    "low": "Very Dissatisfied",
    "high": "Very Satisfied"
  },
  "required": true
}
```

#### Multiple Choice (Single)
```javascript
{
  "type": "radio",
  "text": "Which location did you visit?",
  "options": [
    {"value": "dubai_mall", "label": "Dubai Mall"},
    {"value": "moe", "label": "Mall of the Emirates"},
    {"value": "ibn_battuta", "label": "Ibn Battuta Mall"},
    {"value": "other", "label": "Other"}
  ],
  "required": true
}
```

#### Multiple Choice (Multiple)
```javascript
{
  "type": "checkbox",
  "text": "Which products did you purchase? (Select all)",
  "options": [
    {"value": "clothing", "label": "Clothing"},
    {"value": "accessories", "label": "Accessories"},
    {"value": "shoes", "label": "Shoes"},
    {"value": "bags", "label": "Bags"}
  ],
  "validation": {
    "minSelected": 1,
    "maxSelected": 4
  }
}
```

#### Dropdown
```javascript
{
  "type": "select",
  "text": "In which country do you reside?",
  "options": [
    {"value": "ae", "label": "United Arab Emirates"},
    {"value": "sa", "label": "Saudi Arabia"},
    {"value": "kw", "label": "Kuwait"}
  ]
}
```

#### Matrix/Grid
```javascript
{
  "type": "matrix",
  "text": "Rate the following aspects:",
  "rows": [
    {"id": "quality", "label": "Product Quality"},
    {"id": "service", "label": "Customer Service"},
    {"id": "value", "label": "Value for Money"}
  ],
  "columns": [
    {"value": "1", "label": "Poor"},
    {"value": "2", "label": "Fair"},
    {"value": "3", "label": "Good"},
    {"value": "4", "label": "Excellent"}
  ]
}
```

#### File Upload
```javascript
{
  "type": "file",
  "text": "Upload receipt (optional)",
  "accept": "image/*,.pdf",
  "maxSize": 5242880  // 5 MB
}
```

#### Date/Time
```javascript
{
  "type": "date",
  "text": "When did you visit?",
  "min": "2024-01-01",
  "max": "2024-12-31"
}
```

#### Geolocation
```javascript
{
  "type": "geolocation",
  "text": "Current location",
  "accuracy": "high",
  "required": false
}
```

---

## Advanced Features

### Conditional Logic (Skip Logic)

**Show/Hide Questions:**
```javascript
{
  "id": "cond1",
  "condition": {
    "questionId": "q_satisfaction",
    "operator": "lessThan",
    "value": "3"
  },
  "actions": [
    {
      "type": "show",
      "target": "q_dissatisfaction_reason"
    }
  ]
}
```

**Common Operators:**
- `equals` - Exact match
- `notEquals` - Not equal
- `contains` - Contains text
- `greaterThan` - Numeric/date comparison
- `lessThan` - Numeric/date comparison
- `in` - Value in array
- `notIn` - Value not in array

**Example: NPS Follow-up**
```javascript
// Show follow-up based on NPS score
{
  "condition": {"questionId": "nps", "operator": "greaterThan", "value": "8"},
  "actions": [{"type": "show", "target": "promoter_question"}]
},
{
  "condition": {"questionId": "nps", "operator": "lessThan", "value": "7"},
  "actions": [{"type": "show", "target": "detractor_question"}]
}
```

### Piping (Text Substitution)

Reference previous answers in questions:

```javascript
{
  "id": "q_name",
  "type": "text",
  "text": "What is your name?"
},
{
  "id": "q_followup",
  "type": "text",
  "text": "Thank you, {{q_name}}. How can we improve?",
  "piping": {
    "enabled": true,
    "template": "Thank you, {{q_name}}. How can we improve?"
  }
}
```

### Calculations

Perform calculations based on answers:

```javascript
{
  "id": "calc_total_score",
  "formula": "{{q1_score}} + {{q2_score}} + {{q3_score}}",
  "outputVariable": "total_score"
}
```

### Multi-Language Support

```javascript
{
  "languages": {
    "en": {
      "title": "Customer Satisfaction Survey",
      "q1_text": "How satisfied are you?"
    },
    "ar": {
      "title": "استطلاع رضا العملاء",
      "q1_text": "ما مدى رضاك؟"
    }
  }
}
```

---

## Survey Organization

### Sections

Group related questions:

```javascript
{
  "sections": [
    {
      "id": "demographics",
      "title": "About You",
      "description": "Help us understand who you are",
      "questions": ["q1", "q2", "q3"]
    },
    {
      "id": "experience",
      "title": "Your Experience",
      "description": "Tell us about your recent visit",
      "questions": ["q4", "q5", "q6"]
    }
  ]
}
```

### Question Randomization

Reduce bias:

```javascript
{
  "randomization": {
    "enabled": true,
    "randomizeQuestions": true,
    "randomizeOptions": true,
    "fixedQuestions": ["q1", "q_last"]  // Keep these in place
  }
}
```

---

## Survey Settings

### General Settings

```
Survey ID: retail-satisfaction-2024
Title: Retail Customer Satisfaction Survey
Description: Help us improve your shopping experience
Status: Draft | Active | Closed | Archived
```

### Appearance

```
Theme: Light | Dark | Custom
Primary Color: #007bff
Logo: Upload (recommended: 200x50px PNG)
Background: White | Image | Gradient
Progress Bar: Show | Hide
Question Numbers: Show | Hide
```

### Behavior

```
☑ Allow anonymous responses
☑ One response per device
☐ Require login
☑ Save partial responses
☑ Show progress bar
☐ Allow going back
☑ Show question numbers
```

### Distribution

```
☑ Public link
☑ QR code
☑ Email invitation
☐ Embed on website
☑ Mobile app
```

**Public Link:**
```
https://yourcompany.com/survey/retail-satisfaction-2024
```

**QR Code:**
- Auto-generated
- Download PNG/SVG
- Print for in-store use

---

## Testing Your Survey

### Preview Mode

1. Click "Preview" button
2. Test all question types
3. Verify conditional logic
4. Check mobile responsiveness
5. Test submission

### Test Responses

1. Enable "Test Mode"
2. Submit test responses
3. Review in Analytics
4. Verify data capture
5. Delete test data before launch

### Checklist Before Launch

- ☐ All questions clear and concise
- ☐ No spelling/grammar errors
- ☐ Required fields appropriate
- ☐ Conditional logic tested
- ☐ Mobile-friendly
- ☐ Analytics configured
- ☐ Distribution methods set up
- ☐ Privacy policy linked
- ☐ Thank you message customized

---

## Publishing & Distribution

### Publish Survey

1. Review all settings
2. Click "Publish"
3. Confirm publication
4. Survey status changes to "Active"

### Distribution Methods

#### 1. Public Link
- Copy link
- Share via email, SMS, social media
- Track link clicks (optional)

#### 2. QR Code
- Generate QR code
- Download high-resolution image
- Print on flyers, posters, receipts
- Place in-store

#### 3. Email Campaign
```
Recipients: Import list or manual entry
Subject: We value your feedback
Template: Survey invitation template
Schedule: Send now | Schedule for later
Personalization: Use recipient name
```

#### 4. Website Embed
```html
<iframe
  src="https://yourcompany.com/survey/retail-satisfaction-2024"
  width="100%"
  height="600px"
  frameborder="0">
</iframe>
```

#### 5. Mobile App
- Deep link integration
- Push notification
- In-app modal

---

## Monitoring Responses

### Real-Time Dashboard

```
Total Responses: 1,234
Today: 147
Completion Rate: 87.3%
Average Time: 4m 12s
```

### Response Table

View individual responses:
- Timestamp
- Respondent info
- Completion status
- Location (if captured)
- Device type
- Time taken

**Actions:**
- View details
- Export
- Delete (with audit trail)
- Flag for review

### Alerts

Configure notifications:
```
Alert when:
☑ Response count reaches 100, 500, 1000
☑ Completion rate drops below 70%
☑ Negative sentiment detected
☑ Specific answer given
```

---

## Analytics & Insights

### Overview

- Response trends (chart)
- Completion funnel
- Drop-off points
- Time analysis

### Question-Level Analytics

For each question:
- Response distribution
- Charts (bar, pie, word cloud)
- Statistics (mean, median, mode)
- Cross-tabulation

### Advanced Analysis

**Sentiment Analysis:**
- AI analyzes text responses
- Positive/Negative/Neutral classification
- Key themes extraction

**Correlation Analysis:**
- Relationships between questions
- Statistical significance

**Segmentation:**
- Filter by demographics
- Compare groups
- Identify trends

### Export Options

1. **PDF Report** - Executive summary
2. **Excel** - Raw data + charts
3. **CSV** - Data only
4. **PowerPoint** - Presentation-ready
5. **API** - Programmatic access

---

## Best Practices

### Question Writing

✅ **Good:**
- "How satisfied are you with our customer service?"
- Clear, specific, unbiased

❌ **Avoid:**
- "Our amazing customer service is great, right?"
- Leading, biased, double-barreled

### Question Order

1. Start with easy questions (name, age)
2. Core questions in the middle
3. Sensitive questions near the end
4. Demographics last
5. Always end with "any other feedback?"

### Survey Length

- **Short (3-5 min):** 5-10 questions - High completion rate
- **Medium (5-10 min):** 10-20 questions - Balanced
- **Long (10+ min):** 20+ questions - Incentivize completion

### Response Options

- Use 5-point scales (better than 3 or 7)
- Always include "Other" option with text field
- Avoid overlapping ranges
- Keep options consistent

### Accessibility

- Use clear, simple language
- Provide alt text for images
- Ensure keyboard navigation
- High contrast colors
- Screen reader compatible

---

## Troubleshooting

**Q: Survey not saving?**
A: Check internet connection, refresh page, verify permissions

**Q: Conditional logic not working?**
A: Verify question IDs, check operator syntax, test in preview

**Q: Analytics not updating?**
A: Wait 5-10 minutes, refresh page, check service status

**Q: QR code not working?**
A: Ensure survey is published, test with multiple QR readers

**Q: Low response rate?**
A: Shorten survey, improve incentives, better distribution

---

## Support Resources

- **Video Tutorials**: /docs/tutorials/
- **Template Library**: 50+ ready-to-use surveys
- **Community Forum**: forum.ousamma.com
- **Email Support**: support@ousamma.com
- **Live Chat**: Available in app

---

**Survey Creator Guide Version**: 1.0
**Last Updated**: 2025-11-14
