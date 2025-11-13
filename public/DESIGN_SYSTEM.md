# Survey System - Design System Documentation

Version: 1.0.0
Last Updated: 2025-11-13

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Design Tokens](#design-tokens)
4. [Components](#components)
5. [Layout System](#layout-system)
6. [Accessibility](#accessibility)
7. [Examples](#examples)

---

## Overview

This design system provides a comprehensive set of design tokens, components, and layouts extracted from the reference HTML. It ensures consistency across all pages and includes:

- **Design Tokens**: Colors, typography, spacing, shadows
- **Component Library**: Reusable UI components (buttons, inputs, cards, etc.)
- **Layout Components**: Header, sidebar, footer, grid system
- **SurveyJS Theme**: Custom theme for survey forms
- **Accessibility**: WCAG 2.1 AA compliant features

---

## Getting Started

### Installation

Include the main design system CSS file in your HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Page Title</title>

  <!-- Design System CSS -->
  <link rel="stylesheet" href="/css/design-system.css">
</head>
<body>
  <!-- Your content here -->
</body>
</html>
```

### Alternative: Import Individual Files

If you only need specific parts of the design system:

```html
<!-- Core tokens only -->
<link rel="stylesheet" href="/css/design-tokens.css">

<!-- Components only -->
<link rel="stylesheet" href="/css/design-tokens.css">
<link rel="stylesheet" href="/css/components.css">

<!-- Layout only -->
<link rel="stylesheet" href="/css/design-tokens.css">
<link rel="stylesheet" href="/css/layout.css">
```

---

## Design Tokens

### Colors

#### Primary Colors
```css
--color-primary-500: #2F60A5
--color-primary-600: #1E4A8C
--color-primary-700: #243D8B
```

#### Secondary Colors
```css
--color-secondary-400: #6DBCBA
--color-secondary-500: #5AACA9
--color-secondary-600: #55AADD
```

#### Text Colors
```css
--color-text-primary: #1E2651
--color-text-secondary: #6b7280
--color-text-muted: #9ca3af
```

#### Semantic Colors
```css
--color-success: #27ae60
--color-warning: #f39c12
--color-danger: #d9534f
--color-info: #3498db
```

### Typography

#### Font Family
```css
--font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
```

#### Font Sizes
```css
--font-size-xs: 11px
--font-size-sm: 12px
--font-size-base: 13px
--font-size-md: 14px
--font-size-lg: 16px
--font-size-xl: 18px
--font-size-2xl: 20px
--font-size-3xl: 24px
```

#### Font Weights
```css
--font-weight-normal: 400
--font-weight-medium: 500
--font-weight-semibold: 600
--font-weight-bold: 700
```

### Spacing Scale

```css
--space-1: 4px
--space-3: 8px
--space-5: 12px
--space-7: 16px
--space-9: 20px
--space-10: 24px
--space-12: 32px
--space-14: 48px
```

### Border Radius

```css
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 10px
--radius-xl: 12px
--radius-2xl: 16px
--radius-3xl: 20px
--radius-4xl: 24px
--radius-full: 50%
```

### Shadows

```css
--shadow-sm: 0 2px 4px rgba(47, 96, 165, 0.1)
--shadow-base: 0 2px 8px rgba(30, 38, 81, 0.08)
--shadow-md: 0 4px 12px rgba(30, 38, 81, 0.12)
--shadow-lg: 0 4px 24px rgba(30, 38, 81, 0.08)
--shadow-xl: 0 8px 24px rgba(30, 38, 81, 0.12)
```

---

## Components

### Buttons

#### Primary Button
```html
<button class="btn btn-primary">Primary Button</button>
```

#### Secondary Button
```html
<button class="btn btn-secondary">Secondary Button</button>
```

#### Icon Button
```html
<button class="btn-icon" aria-label="Settings">
  <svg><!-- icon --></svg>
</button>
```

#### Suggestion Button
```html
<button class="btn-suggestion">Suggestion</button>
```

#### Button Sizes
```html
<button class="btn btn-primary btn-sm">Small</button>
<button class="btn btn-primary">Default</button>
<button class="btn btn-primary btn-lg">Large</button>
```

### Inputs

#### Text Input
```html
<div class="form-field">
  <label class="form-label" for="name">Name</label>
  <input type="text" id="name" class="input" placeholder="Enter your name">
</div>
```

#### Input with Error
```html
<div class="form-field">
  <label class="form-label" for="email">Email</label>
  <input type="email" id="email" class="input" aria-invalid="true">
  <div class="form-error" role="alert">Please enter a valid email</div>
</div>
```

### Cards

#### Basic Card
```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
  </div>
  <div class="card-body">
    <p>Card content goes here</p>
  </div>
  <div class="card-footer">
    <button class="btn btn-primary">Action</button>
  </div>
</div>
```

#### Stat Card
```html
<div class="stat-card">
  <div class="stat-card-header">
    <span class="stat-card-title">Total Surveys</span>
    <div class="stat-card-icon">📊</div>
  </div>
  <div class="stat-card-value">1,234</div>
  <div class="stat-card-change positive">+12.5% from last month</div>
</div>
```

### Badges

```html
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-danger">Danger</span>
```

### Messages (Chat)

```html
<!-- Agent Message -->
<div class="message agent">
  <div class="avatar avatar-agent">AI</div>
  <div class="message-content">
    <p>Hello! How can I help you today?</p>
    <div class="message-time">2:30 PM</div>
  </div>
</div>

<!-- User Message -->
<div class="message user">
  <div class="avatar avatar-user">You</div>
  <div class="message-content">
    <p>I need help creating a survey</p>
    <div class="message-time">2:31 PM</div>
  </div>
</div>
```

### Modals

```html
<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <div class="modal">
    <div class="modal-header">
      <h2 class="modal-title" id="modal-title">Modal Title</h2>
    </div>
    <div class="modal-body">
      <p>Modal content goes here</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary">Cancel</button>
      <button class="btn btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

### Tables

```html
<table class="table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>John Doe</td>
      <td>john@example.com</td>
      <td><span class="badge badge-success">Active</span></td>
    </tr>
  </tbody>
</table>
```

### Tabs

```html
<div class="tabs" role="tablist">
  <button class="tab active" role="tab" aria-selected="true">Tab 1</button>
  <button class="tab" role="tab" aria-selected="false">Tab 2</button>
  <button class="tab" role="tab" aria-selected="false">Tab 3</button>
</div>
```

### Loading States

#### Spinner
```html
<div class="spinner-container">
  <div class="spinner"></div>
  <span class="spinner-text">Loading...</span>
</div>
```

#### Skeleton
```html
<div class="skeleton" style="height: 20px; width: 200px;"></div>
```

---

## Layout System

### Header

```html
<header class="portal-header">
  <div class="header-left">
    <img src="logo.png" alt="Logo" class="header-logo">
    <nav class="header-nav">
      <a href="#" class="nav-link">Home</a>
      <a href="#" class="nav-link">About</a>
      <a href="#" class="nav-link">Contact</a>
    </nav>
  </div>
  <div class="header-right">
    <button class="btn-refresh" aria-label="Refresh">
      <svg><!-- refresh icon --></svg>
    </button>
    <button class="lang-btn">العربية</button>
    <button class="login-btn">
      <svg><!-- lock icon --></svg>
      Login
    </button>
  </div>
</header>
```

### Sidebar

```html
<aside class="sidebar">
  <div class="sidebar-header">
    <h2 class="sidebar-title">Menu</h2>
  </div>
  <nav>
    <ul class="sidebar-nav">
      <li class="sidebar-nav-item">
        <a href="#" class="sidebar-nav-link active">
          <svg class="sidebar-nav-icon"><!-- icon --></svg>
          Dashboard
        </a>
      </li>
      <li class="sidebar-nav-item">
        <a href="#" class="sidebar-nav-link">
          <svg class="sidebar-nav-icon"><!-- icon --></svg>
          Surveys
        </a>
      </li>
    </ul>
  </nav>
</aside>
```

### Grid System

```html
<!-- 3 Column Grid -->
<div class="grid grid-cols-3 gap-md">
  <div class="card">Column 1</div>
  <div class="card">Column 2</div>
  <div class="card">Column 3</div>
</div>

<!-- Auto-fit Grid -->
<div class="grid grid-auto gap-md">
  <div class="card">Item 1</div>
  <div class="card">Item 2</div>
  <div class="card">Item 3</div>
</div>
```

### Container

```html
<div class="container">
  <!-- Max-width content -->
</div>

<div class="container-sm">
  <!-- Smaller max-width content -->
</div>

<div class="container-fluid">
  <!-- Full-width content with padding -->
</div>
```

---

## Accessibility

### Skip Link

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```

### Screen Reader Only Text

```html
<span class="sr-only">This text is only visible to screen readers</span>
```

### ARIA Labels

```html
<!-- Button with icon -->
<button class="btn-icon" aria-label="Delete item">
  <svg><!-- trash icon --></svg>
</button>

<!-- Input with error -->
<input type="text"
       id="email"
       class="input"
       aria-invalid="true"
       aria-describedby="email-error">
<div id="email-error" class="form-error" role="alert">
  Invalid email format
</div>
```

### Focus Management

All interactive elements have visible focus indicators that comply with WCAG 2.1 AA standards.

### Keyboard Navigation

- **Tab**: Navigate forward through interactive elements
- **Shift + Tab**: Navigate backward
- **Enter/Space**: Activate buttons and links
- **Escape**: Close modals and dropdowns
- **Arrow Keys**: Navigate within tabs, radio groups, etc.

---

## Examples

### Complete Page Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - Survey Platform</title>
  <link rel="stylesheet" href="/css/design-system.css">
</head>
<body>
  <!-- Skip Link -->
  <a href="#main-content" class="skip-link">Skip to main content</a>

  <!-- Header -->
  <header class="portal-header">
    <div class="header-left">
      <img src="logo.png" alt="Survey Platform" class="header-logo">
      <nav class="header-nav" aria-label="Main navigation">
        <a href="#" class="nav-link">Dashboard</a>
        <a href="#" class="nav-link">Surveys</a>
        <a href="#" class="nav-link">Analytics</a>
      </nav>
    </div>
    <div class="header-right">
      <button class="lang-btn">العربية</button>
      <button class="login-btn">
        <svg width="14" height="14"><!-- icon --></svg>
        Login
      </button>
    </div>
  </header>

  <!-- Main Content -->
  <main id="main-content" class="content-wrapper">
    <h1>Dashboard</h1>

    <!-- Dashboard Grid -->
    <div class="dashboard-grid">
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">Total Surveys</span>
          <div class="stat-card-icon">📊</div>
        </div>
        <div class="stat-card-value">1,234</div>
        <div class="stat-card-change positive">+12.5%</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">Responses</span>
          <div class="stat-card-icon">📝</div>
        </div>
        <div class="stat-card-value">45,678</div>
        <div class="stat-card-change positive">+8.3%</div>
      </div>
    </div>

    <!-- Card -->
    <div class="card mt-5">
      <div class="card-header">
        <h2 class="card-title">Recent Activity</h2>
      </div>
      <div class="card-body">
        <p>Your recent activity will appear here.</p>
      </div>
    </div>
  </main>
</body>
</html>
```

### Chat Interface

```html
<div class="content-wrapper">
  <div class="chat-container">
    <!-- Messages Area -->
    <div class="chat-messages" role="log" aria-live="polite">
      <div class="message agent">
        <div class="avatar avatar-agent">AI</div>
        <div class="message-content">
          <p>Hello! How can I help you today?</p>
          <div class="message-time">2:30 PM</div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="chat-input-container">
      <form class="chat-input-form">
        <button type="button" class="btn-plus" aria-label="Attach file">+</button>
        <input type="text"
               class="input"
               placeholder="Type your message..."
               aria-label="Chat message">
        <button type="submit" class="btn btn-primary btn-rounded">Send</button>
      </form>
    </div>
  </div>
</div>
```

---

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

---

## Responsive Breakpoints

```css
/* Mobile: < 480px */
/* Tablet: 481px - 768px */
/* Desktop: 769px - 968px */
/* Large Desktop: > 968px */
```

---

## Contributing

When adding new components:

1. Follow existing naming conventions
2. Use design tokens instead of hardcoded values
3. Ensure WCAG 2.1 AA compliance
4. Test on all supported browsers
5. Add documentation to this file

---

## Version History

### 1.0.0 (2025-11-13)
- Initial release
- Complete design system extracted from reference HTML
- All core components implemented
- Accessibility features added
- SurveyJS theme customization
- Responsive design support

---

## Support

For issues or questions, please refer to the project repository or contact the development team.
