import React, { useEffect } from 'react';

import { AnalyticsCalculator } from './utils/analytics';
import { useAppState } from './hooks/useAppState';
import { useStudySession } from './hooks/useStudySession';
import { useNavigation } from './hooks/useNavigation';
import { useAICardGeneration } from './hooks/useAICardGeneration';

import MainLayout from './components/MainLayout';
import DashboardPage from './components/DashboardPage';
import StudyPage from './components/StudyPage';
import DataManagementPage from './components/DataManagementPage';

import type { ProgressStats, LearningAnalytics } from './types';

// Assume process.env.API_KEY is available in the execution environment
const API_KEY = process.env.API_KEY;

const App: React.FC = () => {
  // Use custom hooks for state management
  const appState = useAppState();
  const navigation = useNavigation();

  // Study session management
  const studySession = useStudySession(
    appState.allCards,
    appState.updateCard,
    appState.getTodayDateString
  );

  // AI card generation
  const aiCardGeneration = useAICardGeneration(
    appState.allCards,
    appState.addCards,
    appState.getTodayDateString,
    API_KEY
  );

  // Calculate progress statistics
  const progressStats: ProgressStats = AnalyticsCalculator.calculateProgressStats(appState.allCards, studySession.studySessions);
  const learningAnalytics: LearningAnalytics = AnalyticsCalculator.calculateLearningAnalytics(appState.allCards, studySession.studySessions);
  const achievements = AnalyticsCalculator.generateAchievements(progressStats);
  const deckProgress = AnalyticsCalculator.calculateDeckProgress(appState.allCards);

  // Real stats for sidebar
  const stats = {
    totalCards: progressStats.totalCards,
    cardsStudiedToday: progressStats.studySessionsToday,
    currentStreak: progressStats.currentStreak,
    averageAccuracy: Math.round(progressStats.averageAccuracy)
  };

  const recentDecks = [
    { id: 1, name: 'Basic Vocabulary', lastStudied: '2 hours ago', progress: 75 },
    { id: 2, name: 'Phrasal Verbs', lastStudied: '1 day ago', progress: 45 },
    { id: 3, name: 'Business English', lastStudied: '3 days ago', progress: 90 }
  ];


  // Preload images for better performance
  useEffect(() => {
    const preloadImage = (src?: string) => {
      if (src) {
        const img = new Image();
        img.src = src;
      }
    };

    if (studySession.reviewDeck.length > 0 && studySession.currentReviewCardIndex < studySession.reviewDeck.length) {
      preloadImage(studySession.reviewDeck[studySession.currentReviewCardIndex]?.image);
      if (studySession.currentReviewCardIndex < studySession.reviewDeck.length - 1) {
        preloadImage(studySession.reviewDeck[studySession.currentReviewCardIndex + 1]?.image);
      }
    }
  }, [studySession.currentReviewCardIndex, studySession.reviewDeck]);

  // Data import handler
  const handleDataImported = () => {
    // Refresh the app data after import
    window.location.reload();
  };

  // Render the appropriate page based on current view
  const renderCurrentPage = () => {
    switch (navigation.currentView) {
      case 'dashboard':
        return (
          <DashboardPage
            progressStats={progressStats}
            learningAnalytics={learningAnalytics}
            achievements={achievements}
            deckProgress={deckProgress}
            studySessions={studySession.studySessions}
          />
        );
      case 'progress':
        return (
          <div className="text-center bg-white p-8 rounded-xl shadow-2xl w-full">
            <h2 className="text-2xl font-semibold text-primary-600 mb-4">Progress View</h2>
            <p className="text-neutral-700">Detailed progress tracking coming soon!</p>
            <p className="text-neutral-600 mt-2">For now, check out the Dashboard for comprehensive analytics.</p>
          </div>
        );
      case 'settings':
        return (
          <DataManagementPage onDataImported={handleDataImported} />
        );
      default: // 'study'
        return (
          <StudyPage
            // Study session state
            reviewDeck={studySession.reviewDeck}
            currentReviewCardIndex={studySession.currentReviewCardIndex}
            isFlipped={studySession.isFlipped}
            sessionCompleted={studySession.sessionCompleted}
            currentCardData={studySession.currentCardData}

            // Loading state
            isLoading={appState.isLoading}

            // Actions
            handleFlip={studySession.handleFlip}
            handleNextCard={studySession.handleNextCard}
            handlePreviousCard={studySession.handlePreviousCard}
            handleRecallQuality={studySession.handleRecallQuality}
            handleGenerateAICards={aiCardGeneration.generateBulkCards}
            refreshDeckAndSession={studySession.refreshDeckAndSession}
            setShowManualForm={appState.setShowManualForm}
            setManualCreationError={aiCardGeneration.setManualCreationError}

            // API availability
            apiKeyAvailable={!!API_KEY}
          />
        );
    }
  };

  if (appState.isLoading && !aiCardGeneration.isGeneratingCards) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-background p-4 text-neutral-800">
        <h1 className="text-4xl sm:text-5xl font-bold text-white shadow-2xl animate-fade-in text-gradient-primary">LinguaFlip</h1>
        <p className="text-xl text-primary-100 mt-4 animate-bounce-subtle">Loading your learning journey...</p>
      </div>
    );
  }

  return (
    <MainLayout
      isSidebarOpen={navigation.isSidebarOpen}
      onToggleSidebar={navigation.handleToggleSidebar}
      currentView={navigation.currentView}
      onViewChange={navigation.handleViewChange}
      stats={stats}
      recentDecks={recentDecks}
      breadcrumbItems={navigation.getBreadcrumbItems()}
    >
      {renderCurrentPage()}
    </MainLayout>
  );
};

export default App;