/**
 * Feature Flags Service
 * Manages feature toggles and experimental features
 */

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage?: number; // For gradual rollouts
  dependencies?: string[];
  category: 'audio' | 'ui' | 'study' | 'experimental';
}

export interface FeatureFlagConfig {
  flags: Record<string, FeatureFlag>;
  environment: 'development' | 'staging' | 'production';
  userId?: string;
}

// Default feature flags
const DEFAULT_FLAGS: Record<string, FeatureFlag> = {
  'gemini-tts': {
    key: 'gemini-tts',
    name: 'Gemini Text-to-Speech',
    description: 'Enable Gemini AI-powered text-to-speech with high-quality voices',
    enabled: true,
    rolloutPercentage: 100,
    category: 'audio'
  },
  'tts-caching': {
    key: 'tts-caching',
    name: 'TTS Audio Caching',
    description: 'Cache generated audio for improved performance',
    enabled: true,
    dependencies: ['gemini-tts'],
    category: 'audio'
  },
  'tts-streaming': {
    key: 'tts-streaming',
    name: 'TTS Streaming',
    description: 'Stream audio generation for faster response times',
    enabled: true,
    dependencies: ['gemini-tts'],
    category: 'audio'
  },
  'voice-presets': {
    key: 'voice-presets',
    name: 'Voice Presets',
    description: 'Pre-configured voice settings for different use cases',
    enabled: true,
    dependencies: ['gemini-tts'],
    category: 'audio'
  },
  'fallback-tts': {
    key: 'fallback-tts',
    name: 'Fallback TTS',
    description: 'Automatically fallback to browser TTS if Gemini fails',
    enabled: true,
    category: 'audio'
  },
  'enhanced-audio-settings': {
    key: 'enhanced-audio-settings',
    name: 'Enhanced Audio Settings',
    description: 'Advanced audio configuration options',
    enabled: true,
    dependencies: ['gemini-tts'],
    category: 'ui'
  }
};

export class FeatureFlagService {
  private flags: Record<string, FeatureFlag>;
  private environment: 'development' | 'staging' | 'production';
  private userId?: string;
  private storageKey = 'linguaflip-feature-flags';

  constructor(environment: 'development' | 'staging' | 'production' = 'development', userId?: string) {
    this.environment = environment;
    this.userId = userId;
    this.flags = this.loadFlags();
  }

  /**
   * Load feature flags from storage or use defaults
   */
  private loadFlags(): Record<string, FeatureFlag> {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_FLAGS };
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const storedFlags = JSON.parse(stored);
        // Merge with defaults to handle new flags
        return { ...DEFAULT_FLAGS, ...storedFlags };
      }
    } catch (error) {
      console.warn('Failed to load feature flags from storage:', error);
    }

    return { ...DEFAULT_FLAGS };
  }

  /**
   * Save feature flags to storage
   */
  private saveFlags(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.flags));
    } catch (error) {
      console.warn('Failed to save feature flags:', error);
    }
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(flagKey: string): boolean {
    const flag = this.flags[flagKey];
    if (!flag) {
      console.warn(`Feature flag '${flagKey}' not found`);
      return false;
    }

    // Check dependencies
    if (flag.dependencies) {
      const dependenciesMet = flag.dependencies.every(dep => this.isEnabled(dep));
      if (!dependenciesMet) {
        return false;
      }
    }

    // Check rollout percentage for gradual rollouts
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      if (this.userId) {
        // Use consistent hash of userId for stable rollout
        const hash = this.hashString(this.userId + flag.key);
        const userPercentile = hash % 100;
        if (userPercentile >= flag.rolloutPercentage) {
          return false;
        }
      } else {
        // Random rollout for anonymous users
        if (Math.random() * 100 >= flag.rolloutPercentage) {
          return false;
        }
      }
    }

    return flag.enabled;
  }

  /**
   * Enable a feature flag
   */
  enableFlag(flagKey: string): void {
    if (this.flags[flagKey]) {
      this.flags[flagKey] = { ...this.flags[flagKey], enabled: true };
      this.saveFlags();
      console.log(`[FeatureFlags] Enabled: ${flagKey}`);
    }
  }

  /**
   * Disable a feature flag
   */
  disableFlag(flagKey: string): void {
    if (this.flags[flagKey]) {
      this.flags[flagKey] = { ...this.flags[flagKey], enabled: false };
      this.saveFlags();
      console.log(`[FeatureFlags] Disabled: ${flagKey}`);
    }
  }

  /**
   * Toggle a feature flag
   */
  toggleFlag(flagKey: string): boolean {
    if (this.flags[flagKey]) {
      const newState = !this.flags[flagKey].enabled;
      this.flags[flagKey] = { ...this.flags[flagKey], enabled: newState };
      this.saveFlags();
      console.log(`[FeatureFlags] Toggled ${flagKey}: ${newState}`);
      return newState;
    }
    return false;
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): Record<string, FeatureFlag> {
    return { ...this.flags };
  }

  /**
   * Get flags by category
   */
  getFlagsByCategory(category: FeatureFlag['category']): FeatureFlag[] {
    return Object.values(this.flags).filter(flag => flag.category === category);
  }

  /**
   * Get enabled flags
   */
  getEnabledFlags(): FeatureFlag[] {
    return Object.values(this.flags).filter(flag => this.isEnabled(flag.key));
  }

  /**
   * Update rollout percentage
   */
  updateRolloutPercentage(flagKey: string, percentage: number): void {
    if (this.flags[flagKey] && percentage >= 0 && percentage <= 100) {
      this.flags[flagKey] = { ...this.flags[flagKey], rolloutPercentage: percentage };
      this.saveFlags();
      console.log(`[FeatureFlags] Updated rollout for ${flagKey}: ${percentage}%`);
    }
  }

  /**
   * Add or update a feature flag
   */
  addFlag(flag: FeatureFlag): void {
    this.flags[flag.key] = flag;
    this.saveFlags();
    console.log(`[FeatureFlags] Added/Updated: ${flag.key}`);
  }

  /**
   * Remove a feature flag
   */
  removeFlag(flagKey: string): void {
    if (this.flags[flagKey]) {
      delete this.flags[flagKey];
      this.saveFlags();
      console.log(`[FeatureFlags] Removed: ${flagKey}`);
    }
  }

  /**
   * Reset all flags to defaults
   */
  resetToDefaults(): void {
    this.flags = { ...DEFAULT_FLAGS };
    this.saveFlags();
    console.log('[FeatureFlags] Reset to defaults');
  }

  /**
   * Get configuration summary
   */
  getConfig(): FeatureFlagConfig {
    return {
      flags: this.flags,
      environment: this.environment,
      userId: this.userId
    };
  }

  /**
   * Simple hash function for consistent user-based rollouts
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if user should see experimental features
   */
  showExperimentalFeatures(): boolean {
    return this.environment === 'development' || 
           this.isEnabled('experimental-features');
  }

  /**
   * Validate flag dependencies
   */
  validateDependencies(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    Object.values(this.flags).forEach(flag => {
      if (flag.dependencies) {
        flag.dependencies.forEach(depKey => {
          if (!this.flags[depKey]) {
            issues.push(`Flag '${flag.key}' depends on missing flag '${depKey}'`);
          } else if (flag.enabled && !this.flags[depKey].enabled) {
            issues.push(`Flag '${flag.key}' is enabled but dependency '${depKey}' is disabled`);
          }
        });
      }
    });

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

// Singleton instance
let featureFlagInstance: FeatureFlagService | null = null;

/**
 * Get or create feature flag service instance
 */
export const getFeatureFlags = (environment?: 'development' | 'staging' | 'production', userId?: string): FeatureFlagService => {
  if (!featureFlagInstance || environment || userId) {
    const env = environment || (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development';
    featureFlagInstance = new FeatureFlagService(env, userId);
  }
  return featureFlagInstance;
};

/**
 * Utility hook for React components
 */
export const useFeatureFlag = (flagKey: string): boolean => {
  const featureFlags = getFeatureFlags();
  return featureFlags.isEnabled(flagKey);
};

/**
 * Utility hook for getting all flags of a category
 */
export const useFeatureFlags = (category?: FeatureFlag['category']): FeatureFlag[] => {
  const featureFlags = getFeatureFlags();
  
  if (category) {
    return featureFlags.getFlagsByCategory(category);
  }
  
  return featureFlags.getEnabledFlags();
};

export default FeatureFlagService;