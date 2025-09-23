# LinguaFlip - AI-Powered English Flashcards

A comprehensive AI-powered English flashcard application built with Astro, React 18, TypeScript, and Google's Gemini AI. Features a hybrid storage system (localStorage + MongoDB), user authentication, and sophisticated spaced repetition system (SRS) with comprehensive progress tracking and analytics.

## ✨ Features

### Core Learning Features

- 🤖 **AI-Generated Cards**: Automatically generate flashcards using Google's Gemini AI
- 📚 **Manual Card Creation**: Create custom flashcards with rich content
- 🧠 **Advanced Spaced Repetition**: SM-2 algorithm implementation for optimal learning intervals
- 📊 **Comprehensive Analytics**: Study streaks, retention rates, and detailed progress tracking
- 🎯 **Smart Recall Rating**: 5-point recall quality system for personalized learning
- 📈 **Study Heatmap**: Visual representation of study patterns and consistency

### Technical Features

- 🔄 **Hybrid Storage**: Seamless sync between localStorage and MongoDB
- 👤 **User Authentication**: JWT-based secure authentication with bcrypt password hashing
- 📱 **Responsive Design**: Works flawlessly across desktop and mobile devices
- ⚡ **Server-Side Rendering**: Fast loading with Astro SSR
- 🌙 **Dark/Light Theme**: User preference with system detection
- 📊 **Real-time Sync**: Cross-device synchronization with conflict resolution
- 🔒 **Security First**: Rate limiting, secure token storage, and data isolation

## 🚀 Demo

Visit the live demo: [LinguaFlip Flashcards](https://[username].github.io/linguaflip_-english-flashcards/)

## 🛠️ Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (local installation or MongoDB Atlas URI)
- **Google Gemini API key**

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/[username]/linguaflip_-english-flashcards.git
   cd linguaflip_-english-flashcards
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create environment files for your setup:

   **For local development** (`.env.local`):

   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   MONGODB_URI=mongodb://localhost:27017/linguaflip
   JWT_SECRET=your_jwt_secret_here
   ```

   **For production** (`.env.production`):

   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   MONGODB_URI=your_mongodb_atlas_uri_here
   JWT_SECRET=your_production_jwt_secret_here
   ```

4. **Start the development server:**

   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:4321](http://localhost:4321)

## 📖 Usage

### Authentication & Account Management

1. **Register/Login**: Create an account or sign in to sync your progress across devices
2. **Profile Management**: Manage your study preferences and account settings
3. **Data Migration**: Import existing flashcards or export your data

### Creating Flashcards

1. **AI-Generated Cards**: Enter a word or phrase, and Gemini AI will generate comprehensive flashcards with definitions, examples, and usage notes
2. **Manual Creation**: Use the advanced form to create custom flashcards with rich content
3. **Bulk Import**: Import flashcards from CSV or other formats

### Study Experience

1. **Smart Study Sessions**: The app dynamically builds study decks based on spaced repetition algorithms
2. **Interactive Cards**: Flip cards with smooth animations and gesture support
3. **Recall Rating**: Rate your recall quality (1-5 scale) to optimize future review intervals
4. **Progress Tracking**: Monitor streaks, retention rates, and learning analytics
5. **Study Heatmap**: Visualize your study consistency and patterns

### Analytics & Progress

- **Dashboard**: Comprehensive overview of your learning progress
- **Study Statistics**: Detailed metrics on performance and retention
- **Streak Tracking**: Maintain and extend your study streaks
- **Performance Analytics**: Track improvements over time

## 🏗️ Technology Stack

### Core Framework

- **Astro 5.13+**: Server-side rendering and static site generation
- **React 18**: Interactive UI components and state management
- **TypeScript**: Type-safe development with strict typing
- **TailwindCSS**: Utility-first CSS framework for responsive design

### State & Data Management

- **Nanostores**: Reactive state management with client/server sync
- **MongoDB**: Persistent data storage with schema validation
- **Hybrid Storage**: localStorage + MongoDB with automatic synchronization
- **JWT Authentication**: Secure token-based authentication system

### AI & External Services

- **Google Gemini AI**: Advanced language model for flashcard generation
- **bcrypt**: Secure password hashing and verification
- **Express**: API endpoints and middleware

### Development & Testing

- **Puppeteer**: End-to-end testing and screenshot validation
- **Mocha**: Test framework with comprehensive test suites
- **ESLint & Prettier**: Code quality and formatting
- **TypeScript Compiler**: Static type checking

## 🚀 Development Commands

### Core Development

```bash
npm run dev          # Start development server (http://localhost:4321)
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # Run Astro diagnostics and TypeScript checks
npm run check:watch  # Watch mode for type checking
```

### Testing & Quality Assurance

```bash
npm test             # Run all tests
npm run test:design  # Visual/design tests with Puppeteer
npm run test:interaction  # User interaction tests
npm run test:all     # Run both design and interaction tests
npm run test:ci      # CI-optimized test run
npm run test:health  # Database connectivity health checks
```

### Code Quality

```bash
npm run lint         # ESLint check for all files
npm run lint:fix     # Auto-fix linting issues
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
npm run type-check   # TypeScript type checking
```

### Utility Commands

```bash
npm run clean        # Remove build artifacts and caches
npm run deploy       # Build and preview for deployment
```

## 🏭 Deployment

### GitHub Pages (Automated)

This project supports automatic deployment to GitHub Pages using GitHub Actions.

**Setup Steps:**

1. Push your code to GitHub
2. Go to repository **Settings → Pages**
3. Set Source to **"GitHub Actions"**
4. Add environment secrets in **Settings → Secrets and variables → Actions**:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   MONGODB_URI=your_mongodb_atlas_uri_here
   JWT_SECRET=your_production_jwt_secret_here
   ```
5. The workflow automatically deploys on every push to main branch

### Production Build

```bash
npm run build
```

Built files will be in the `dist/` directory, optimized for production deployment.

### Environment Configuration

The app supports multiple environments:

- **Development**: `.env.development`
- **Production**: `.env.production`
- **Testing**: `.env.test`
- **Local**: `.env.local` (git-ignored)

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow the coding standards**: Run `npm run lint` and `npm run format`
4. **Add tests** for new functionality
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to your branch**: `git push origin feature/amazing-feature`
7. **Create a Pull Request**

### Development Guidelines

- Follow TypeScript strict mode requirements
- Maintain test coverage for new features
- Use semantic commit messages
- Ensure all tests pass before submitting PRs
- Follow the existing code style and patterns

## 📋 Project Structure

```
├── src/
│   ├── components/          # React components
│   ├── pages/              # Astro pages (SSR)
│   ├── stores/             # Nanostores state management
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API services and business logic
│   ├── utils/              # Helper functions and utilities
│   ├── types/              # TypeScript type definitions
│   └── middleware/         # Astro middleware (auth, routing)
├── tests/                  # Test suites and configurations
├── astro.config.mjs        # Astro configuration
└── tailwind.config.mjs     # TailwindCSS configuration
```

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔐 Security & API Usage

### Google Gemini AI API

- **Keep your API key secure** - never commit to version control
- **Monitor API usage** - be mindful of rate limits and costs
- **Review Google's terms** - comply with Gemini API terms of service

### Security Best Practices

- JWT tokens are stored securely with httpOnly cookies
- Passwords are hashed using bcrypt with proper salt rounds
- Rate limiting prevents brute force attacks
- User data is isolated and validated on both client and server
- All API endpoints include proper authentication and authorization

### MongoDB Security

- Use connection strings with proper authentication
- Enable MongoDB authentication in production
- Regularly update MongoDB to the latest stable version
- Use environment variables for database credentials

---

**Built with ❤️ using Astro, React, and Google Gemini AI**
