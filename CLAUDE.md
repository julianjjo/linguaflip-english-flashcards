# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

[byterover-mcp]

# Important Instructions

- Always use byterover-retrieve-knowledge tool to get the related context before any tasks
- Always use byterover-store-knowledge to store all the critical informations after sucessful tasks
- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User
- BEFORE always change valid with playwright is correct in the webpage local

## Architecture Overview

LinguaFlip is an AI-powered English flashcard application built with Astro, React 18, TypeScript, and Google's Gemini AI. The application features a hybrid storage system (localStorage + MongoDB), user authentication, and a sophisticated spaced repetition system (SRS) with comprehensive progress tracking and analytics.

### Core Technology Stack

- **Framework**: Astro 5.13+ with server-side rendering (SSR)
- **Frontend**: React 18, TypeScript, TailwindCSS
- **State Management**: Nanostores with reactive stores
- **Database**: MongoDB with bcrypt authentication and JWT tokens
- **AI Integration**: Google Gemini AI (@google/genai)
- **Storage**: Hybrid system (localStorage + MongoDB with sync)
- **Testing**: Mocha + Puppeteer for design/interaction tests

### Application Architecture

- **Astro Pages** (`src/pages/`): SSR pages with .astro files
  - `index.astro`: Dashboard with analytics and progress tracking
  - `study.astro`: Study interface for flashcard review sessions
  - `settings.astro`: User preferences and data management
  - `data.astro`: Data import/export and migration tools

- **React Components** (`src/components/`): Interactive UI components
  - `Flashcard.tsx`: Interactive card with flip animations and gestures
  - `RecallQualityControls.tsx`: SRS rating system for recall assessment
  - `StudyHeatmap.tsx`: Visual study pattern representation
  - `DataManagement.tsx`: Import/export and data migration interface
  - `ThemeToggle.tsx`, `UserSettings.tsx`: User preference controls

- **State Management** (`src/stores/`): Nanostores for reactive state
  - `flashcards.ts`: Global flashcard state with MongoDB integration
  - `study.ts`: Study session state and progress tracking
  - `auth.ts`: User authentication and session management
  - `hybridStorage.ts`: Sync between localStorage and MongoDB

### Data Architecture & Storage

- **Hybrid Storage System**:
  - **Client-side**: localStorage for offline functionality and fast access
  - **Server-side**: MongoDB for persistent storage and cross-device sync
  - **Synchronization**: Automatic sync with conflict resolution and offline support

- **Core Data Types** (`src/types/index.ts`):
  - `FlashcardData`: Complete flashcard with SRS properties (interval, easinessFactor, repetitions, dueDate)
  - `StudySession`, `ProgressStats`: Comprehensive progress tracking and analytics
  - `User`, `AuthState`: Authentication and user management types
  - Database schemas in `src/schemas/mongodb.ts`

- **Authentication & Security** (`src/services/auth/`):
  - JWT-based authentication with secure token storage
  - bcrypt password hashing and rate limiting
  - User data isolation and secure endpoints

### SRS & Study System

- **Spaced Repetition**: SM-2 algorithm implementation in study logic
- **Dynamic Deck Building**: Filters due cards, balances review/new content
- **Progress Analytics**: Streak calculations, retention rates, and learning analytics
- **Study Profiles**: Customizable study configurations and presets

## Development Commands

### Core Development

```bash
astro dev               # Development server (http://localhost:4321)
astro build            # Production build to dist/
astro preview          # Preview production build locally
astro check            # TypeScript and Astro diagnostics
astro check --watch    # Watch mode for type checking
```

### Testing & Quality

```bash
npm test               # Run all tests (calls run-tests.js)
npm run test:design    # Visual/design tests with Puppeteer (30s timeout)
npm run test:interaction # Interaction tests with Puppeteer (30s timeout)
npm run test:all       # Run both design and interaction tests sequentially
npm run test:parallel  # Run tests in parallel
npm run test:ci        # CI-optimized test run
npm run test:health    # Health check tests
npm run design-review  # Generate design review report and screenshots
```

### Code Quality & Linting

```bash
npm run lint           # ESLint check (.js,.jsx,.ts,.tsx,.astro files)
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Prettier
npm run format:check   # Check code formatting
npm run type-check     # TypeScript type checking (no emit)
```

### Utility Commands

```bash
npm run clean          # Remove dist, node_modules/.astro, test-results
npm run deploy         # Build and preview (for deployment prep)
npm run test:setup     # Set up test environment
npm run test:cleanup   # Clean up test environment
```

### Environment Setup

Multiple environment files for different contexts:

- `.env.local` - Local development (not committed)
- `.env.development` - Development environment
- `.env.production` - Production environment
- `.env.test` - Test environment

Required environment variables:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=mongodb://localhost:27017/linguaflip  # or MongoDB Atlas URI
JWT_SECRET=your_jwt_secret_here
```

### Development Architecture Patterns

- **Astro + React Hybrid**: SSR pages (.astro) with interactive React islands
- **Nanostores State**: Reactive global state management with client/server sync
- **Hybrid Storage**: localStorage + MongoDB with automatic synchronization
- **Progressive Enhancement**: Features work offline, sync when connected
- **Component Islands**: React components embedded in Astro pages for interactivity

### Build Configuration & Optimization

- **Path Aliases**: `@/` resolves to `/src` for cleaner imports
- **Code Splitting**: Automatic chunking by vendor libraries and application modules
  - `react-vendor`: React and React DOM
  - `state-vendor`: Nanostores libraries
  - `ai-vendor`: Google Gemini AI
  - Component chunks: `flashcard-components`, `ui-components`, `settings-components`
- **SSR Optimization**: MongoDB and related modules excluded from client bundle
- **Image Optimization**: Sharp service for optimized image processing

### MongoDB Integration & Testing

- **Local Development**: Use MongoDB locally or MongoDB Memory Server for tests
- **Test Database**: Automated test setup with in-memory MongoDB instances
- **Schema Validation**: Dedicated schemas in `src/schemas/mongodb.ts`
- **Data Migration**: Utilities in `src/utils/dataMigration.ts` for version upgrades

## Project Structure & Key Patterns

### File Organization

- **Astro Pages**: `src/pages/` - SSR pages with .astro extension
- **React Components**: `src/components/` - Interactive UI components (.tsx)
- **Hooks**: `src/hooks/` - Custom React hooks for state and effects
- **Stores**: `src/stores/` - Nanostores for global state management
- **Services**: `src/services/` - API calls and business logic
- **Utils**: `src/utils/` - Helper functions and utilities
- **Types**: `src/types/` - TypeScript type definitions
- **Middleware**: `src/middleware/` - Astro middleware for auth/routing

### Key Development Patterns

- **Server/Client Separation**: SSR pages with client-side React islands
- **Data Synchronization**: Automatic sync between localStorage and MongoDB
- **Authentication Flow**: JWT-based auth with secure token storage
- **Error Handling**: Centralized error handling with user-friendly messages
- **Type Safety**: Strict TypeScript with comprehensive type definitions

### Testing Strategy

- **Visual Testing**: Puppeteer for UI component validation and screenshot comparison
- **Interaction Testing**: Automated user interaction simulation with gesture support
- **MongoDB Testing**: In-memory database for isolation and speed
- **Component Testing**: Specific tests for flashcard flip animations and user interactions
- **Integration Testing**: Full authentication flow and hybrid storage synchronization
- **Performance Testing**: Load testing and performance validation
- **CI/CD Testing**: Optimized test suites for continuous integration
- **Health Checks**: Database connectivity and service availability tests

### Test File Structure

- `tests/design-tests.js` - Visual component validation
- `tests/interaction-tests.js` - User interaction simulation
- `tests/flashcard-flip-test.cjs` - Flashcard component testing
- `tests/auth-integration-test.js` - Authentication flow testing
- `tests/hybrid-storage-test.js` - Storage synchronization testing
- `tests/mongodb-connection-test.js` - Database connectivity
- `tests/performance-validation.js` - Performance benchmarks
