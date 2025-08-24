# LinguaFlip - English Flashcards

An AI-powered English flashcard application built with React, TypeScript, and Google's Gemini AI. Create, study, and track your progress with intelligent spaced repetition flashcards.

## Features

- 🤖 **AI-Generated Cards**: Automatically generate flashcards using Google's Gemini AI
- 📚 **Manual Card Creation**: Create custom flashcards manually
- 🧠 **Spaced Repetition**: Intelligent review system based on recall quality
- 📊 **Progress Tracking**: Monitor your learning progress over time
- 🎯 **Recall Quality Controls**: Rate your recall to optimize review intervals
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices

## Demo

Visit the live demo: [LinguaFlip Flashcards](https://[username].github.io/linguaflip_-english-flashcards/)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Google Gemini API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/[username]/linguaflip_-english-flashcards.git
   cd linguaflip_-english-flashcards
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## Usage

### Creating Flashcards

1. **AI-Generated**: Enter a word or phrase, and the AI will generate a comprehensive flashcard with definition, example, and usage notes
2. **Manual Creation**: Use the manual form to create custom flashcards with your own content

### Studying

- Navigate through your flashcards using the arrow buttons
- Rate your recall quality (1-5 scale) to optimize future review intervals
- The app uses spaced repetition algorithms to show cards when you need to review them most

## Technology Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite
- **AI Integration**: Google Gemini AI
- **Styling**: CSS-in-JS
- **Deployment**: GitHub Pages with GitHub Actions

## Deployment

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Setup GitHub Pages Deployment

1. Push your code to GitHub
2. Go to your repository's Settings → Pages
3. Set Source to "GitHub Actions"
4. Add your `GEMINI_API_KEY` in Settings → Secrets and variables → Actions
5. The workflow will automatically deploy on every push to the main branch

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## API Usage

This application uses the Google Gemini AI API to generate flashcard content. Make sure to:
- Keep your API key secure and never commit it to version control
- Be mindful of API usage limits and costs
- Review Google's terms of service for the Gemini API
