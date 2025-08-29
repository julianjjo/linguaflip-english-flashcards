# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

[byterover-mcp]

# important 
always use byterover-retrieve-knowledge tool to get the related context before any tasks 
always use byterover-store-knowledge to store all the critical informations after sucessful tasks

## Architecture Overview

LinguaFlip is an AI-powered English flashcard application built with React 19, TypeScript, and Google's Gemini AI. The application uses a sophisticated spaced repetition system (SRS) with comprehensive progress tracking and analytics.

### Core Application Structure

- **App.tsx**: Main application orchestrator using React hooks for state management, routing between views (dashboard/study/settings), and coordinating multiple custom hooks
- **Hook-Based Architecture**: 
  - `useAppState`: Manages flashcard data, localStorage persistence, and loading states
  - `useStudySession`: Handles study session logic, deck building, and SRS algorithm
  - `useNavigation`: Manages view routing and sidebar state
  - `useAICardGeneration`: Handles AI card generation and manual card creation

### Key Components & Pages

- **Core Study Components**:
  - `Flashcard.tsx`: Interactive card with flip animations, text-to-speech, and touch gestures
  - `RecallQualityControls.tsx`: Rating buttons for SRS quality assessment
  - `StudyPage.tsx`: Main study interface with session controls
  - `TouchGestureHandler.tsx`: Mobile-optimized swipe gestures for card navigation

- **Dashboard & Analytics**:
  - `DashboardPage.tsx`: Comprehensive analytics dashboard with charts and progress tracking
  - `ProgressDashboard.tsx`: Real-time study statistics and achievements
  - `StudyHeatmap.tsx`: Visual representation of study patterns
  - `AnalyticsCalculator` (utils): Complex analytics calculations for progress stats, learning analytics, and achievement tracking

- **Layout & Navigation**:
  - `MainLayout.tsx`: Application shell with responsive sidebar and header
  - `Sidebar.tsx`: Navigation menu with study statistics
  - `Breadcrumb.tsx`: Context navigation for current view

### Data Architecture & Types

- **Core Data Types** (`types.ts`):
  - `FlashcardData`: Complete flashcard structure with SRS properties (interval, easinessFactor, repetitions, dueDate)
  - `StudySession`, `ProgressStats`, `LearningAnalytics`: Comprehensive progress tracking
  - `StudyProfile`: Customizable study configurations with presets
  - `Achievement`, `DeckProgress`: Gamification and progress visualization

- **SRS Implementation**: 
  - SM-2 algorithm with configurable easiness factors and learning steps
  - Dynamic review deck building (filters due cards, balances review/new cards)
  - Progress tracking with streak calculations and retention rates

### AI Integration & Data Management

- **Google Gemini Integration**: Bulk card generation and translation services
- **Data Export/Import** (`utils/dataExport.ts`): JSON/CSV export capabilities for flashcard data
- **localStorage Persistence**: Automatic card migration and data integrity checks

## Common Development Tasks

### Development Commands
```bash
npm run dev              # Vite development server (http://localhost:5173)
npm run build            # Production build to dist/
npm run preview          # Preview production build locally
npm start                # Express server serving dist/ files
```

### Testing Commands
```bash
npm test                 # Run design tests with Mocha/Puppeteer
npm run test:design      # Same as npm test - runs visual/interaction tests
npm run design-review    # Generate design review report and screenshots
```

### Environment Setup
Create `.env.local` in project root:
```
GEMINI_API_KEY=your_api_key_here
```

### Development Architecture Notes

- **Hook-Based State Management**: All complex state logic is encapsulated in custom hooks rather than Context API or external state libraries
- **Component Composition**: Pages are composed of smaller, focused components rather than monolithic components
- **Utility Classes**: Complex calculations and business logic are separated into utility classes (e.g., `AnalyticsCalculator`)
- **Responsive Design**: TailwindCSS with mobile-first approach and touch gesture support

## Deployment

- **GitHub Pages**: Automatic deployment via GitHub Actions workflow (`.github/workflows/deploy.yml`)
- **Environment**: Requires `GEMINI_API_KEY` secret in repository settings
- **Build Process**: Vite build with TailwindCSS optimization

## Project Structure & Conventions

### File Organization
- **Flat Architecture**: Components stored in `components/` rather than nested `src/` structure
- **Utility Separation**: Business logic in `utils/` directory with focused, single-responsibility classes
- **Hook Extraction**: Complex state logic extracted to `hooks/` for reusability
- **Type Definitions**: Comprehensive TypeScript interfaces in `types.ts` for all data structures

### Key Development Patterns
- **Data Migration**: `useAppState` handles automatic localStorage data migration for backward compatibility
- **SRS Algorithm**: SM-2 implementation in `utils/studySession.ts` with configurable parameters
- **Progressive Enhancement**: AI features gracefully degrade when API key unavailable
- **Touch Optimization**: Mobile-first design with gesture handlers for study interactions

### Testing & Quality
- **Visual Testing**: Puppeteer-based design tests validate UI components and interactions
- **Design Review**: Automated screenshot generation for design consistency checks
- **TypeScript**: Strict typing throughout with comprehensive interfaces

### Technical Stack & Constraints
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: TailwindCSS v3 with PostCSS (v3 for PostCSS compatibility, not v4)
- **AI**: Google Gemini AI (@google/genai)
- **Server**: Express.js for production serving
- **Storage**: Browser localStorage for data persistence
- **Environment Variables**: Uses Vite's `process.env` handling, not `import.meta.env`
- **No Linting**: Project doesn't include ESLint/Prettier - follow existing code style