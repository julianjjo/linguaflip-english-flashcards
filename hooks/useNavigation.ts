import { useState, useCallback } from 'react';

export type ViewType = 'study' | 'dashboard' | 'progress' | 'settings';

export const useNavigation = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<ViewType>('study');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Navigation handlers
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  const handleViewChange = useCallback((view: string) => {
    setCurrentView(view as ViewType);
    setIsSidebarOpen(false); // Close sidebar on mobile after navigation
  }, []);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  // Breadcrumb items based on current view
  const getBreadcrumbItems = useCallback(() => {
    return [
      { label: 'Home', href: '#' },
      { label: currentView.charAt(0).toUpperCase() + currentView.slice(1), current: true }
    ];
  }, [currentView]);

  return {
    // State
    isSidebarOpen,
    currentView,
    isSettingsOpen,

    // Setters
    setIsSidebarOpen,
    setCurrentView,
    setIsSettingsOpen,

    // Actions
    handleToggleSidebar,
    handleViewChange,
    handleOpenSettings,
    handleCloseSettings,
    getBreadcrumbItems,
  };
};