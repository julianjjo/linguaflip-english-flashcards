import { useStore } from '@nanostores/react';
import { map } from 'nanostores';
import { navigationStore, navigationActions } from '../stores/flashcards.js';

export type ViewType = 'study' | 'dashboard' | 'progress' | 'settings';

// Estado adicional para UI que no está en el store global
const uiStateStore = map({
  isSidebarOpen: false,
  isSettingsOpen: false,
});

export const useNavigation = () => {
  const navigation = useStore(navigationStore);
  const uiState = useStore(uiStateStore);

  // Navigation handlers
  const handleToggleSidebar = () => {
    const current = uiStateStore.get();
    uiStateStore.set({
      ...current,
      isSidebarOpen: !current.isSidebarOpen,
    });
  };

  const handleViewChange = (view: string) => {
    navigationActions.navigate(view as ViewType);
    // Close sidebar on mobile after navigation
    uiStateStore.setKey('isSidebarOpen', false);
  };

  const handleOpenSettings = () => {
    uiStateStore.setKey('isSettingsOpen', true);
  };

  const handleCloseSettings = () => {
    uiStateStore.setKey('isSettingsOpen', false);
  };

  // Breadcrumb items based on current view
  const getBreadcrumbItems = () => {
    return [
      { label: 'Home', href: '#' },
      {
        label:
          navigation.currentView.charAt(0).toUpperCase() +
          navigation.currentView.slice(1),
        current: true,
      },
    ];
  };

  return {
    // State
    isSidebarOpen: uiState.isSidebarOpen,
    currentView: navigation.currentView,
    isSettingsOpen: uiState.isSettingsOpen,

    // Actions
    handleToggleSidebar,
    handleViewChange,
    handleOpenSettings,
    handleCloseSettings,
    getBreadcrumbItems,
  };
};
