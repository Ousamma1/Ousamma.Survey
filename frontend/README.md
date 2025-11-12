# Survey Platform Frontend

A modern, feature-rich survey platform built with React, TypeScript, and Vite. This application provides a complete survey creation, management, and analytics solution with service-oriented architecture integration.

## Features

### 🎨 Modern Tech Stack
- **React 18** with TypeScript for type-safe development
- **Vite** for lightning-fast development and builds
- **Tailwind CSS** for responsive, utility-first styling
- **React Router** for client-side routing
- **Axios** for API communication with interceptors and retry logic
- **SurveyJS** for powerful survey creation and rendering

### 🔐 Authentication & Authorization
- JWT-based authentication with token refresh
- Login/Register pages with validation
- Protected routes with role-based access control
- Auto-logout on token expiry
- Session management

### 📊 Survey Management
- **Survey Creator** with SurveyJS integration
  - All question types supported
  - Custom theme configuration
  - Preview functionality
  - Save/publish workflow
- **Survey List** with filtering and search
  - Grid/list view
  - Status badges (draft, published, closed, archived)
  - Quick actions (edit, duplicate, delete)
  - Pagination support

### 🏗️ Architecture
- Feature-based folder structure
- Microservice-ready API clients
- Centralized state management with Context API
- Reusable design system components
- Type-safe API layer

## Project Structure

```
frontend/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Header.tsx
│   │   └── ProtectedRoute.tsx
│   ├── features/          # Feature modules
│   │   ├── auth/          # Authentication
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── surveys/       # Survey management
│   │   │   ├── Dashboard.tsx
│   │   │   ├── SurveyList.tsx
│   │   │   ├── SurveyCreator.tsx
│   │   │   └── SurveyTaker.tsx
│   │   ├── responses/     # Response management
│   │   ├── analytics/     # Analytics & reporting
│   │   └── admin/         # Admin panel
│   ├── services/          # API clients
│   │   ├── api-client.ts
│   │   ├── auth.service.ts
│   │   ├── survey.service.ts
│   │   ├── response.service.ts
│   │   └── analytics.service.ts
│   ├── hooks/             # Custom React hooks
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript types
│   │   └── index.ts
│   └── styles/            # Global styles & tokens
│       └── design-tokens.ts
```

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your API service URLs:
```env
VITE_AUTH_SERVICE_URL=http://localhost:3001/api
VITE_SURVEY_SERVICE_URL=http://localhost:3002/api
VITE_RESPONSE_SERVICE_URL=http://localhost:3003/api
VITE_ANALYTICS_SERVICE_URL=http://localhost:3004/api
```

3. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## API Integration

The application is designed to work with a microservices architecture. Each service has its own API client with:

- **Token Interceptors**: Automatically adds JWT tokens to requests
- **Error Handling**: Centralized error handling and user feedback
- **Retry Logic**: Automatic retry for failed requests
- **Request/Response Transformation**: Consistent data format across services

### Services

1. **Auth Service**: User authentication, registration, profile management
2. **Survey Service**: Survey CRUD operations, publishing, archiving
3. **Response Service**: Survey response submission and retrieval
4. **Analytics Service**: Survey analytics and reporting

## Design System

The application includes a complete design system with:

- **Color Palette**: Primary, secondary, success, warning, error, info
- **Typography**: Consistent font sizes and weights
- **Spacing**: Standard spacing scale
- **Components**: Button, Input, Card, Modal, and more
- **Responsive**: Mobile-first design with Tailwind CSS

## Authentication Flow

1. User logs in or registers
2. JWT tokens stored in localStorage
3. Tokens automatically attached to API requests
4. Auto-refresh on token expiry
5. Auto-logout on refresh failure

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Technologies

- React 18
- TypeScript 5
- Vite 6
- Tailwind CSS 3
- React Router 6
- Axios
- SurveyJS
- React Query (TanStack Query)
- React Hook Form
- Zod (validation)

## License

MIT
