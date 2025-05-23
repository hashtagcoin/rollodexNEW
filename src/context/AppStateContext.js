import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

// Create the context
const AppStateContext = createContext();

// Categories for Provider Discovery
const CATEGORIES = ['Therapy', 'Housing', 'Support', 'Transport', 'Tech', 'Personal', 'Social'];

// Create a provider component
export const AppStateProvider = ({ children }) => {
  // State that needs to persist across component unmounts
  const [selectedCategory, setSelectedCategoryState] = useState('Therapy');
  
  // Navigation state management
  const navigationStateRef = useRef({
    lastScreen: null,
    transitionInProgress: false,
    pendingCategoryChange: null,
  });
  
  // Caches for data and images
  const dataCacheRef = useRef({});
  const loadedImagesRef = useRef(new Set());
  
  // Debug tracking
  const debugCounters = useRef({
    mounts: 0,
    categoryChanges: 0,
    dataFetches: 0,
    imageLoads: 0,
  });
  
  // Log wrapper function with timestamp
  const logDebug = useCallback((component, action, details = {}) => {
    const timestamp = new Date().toISOString().substring(11, 23);
    console.log(`[${timestamp}][${component}] ${action}`, details);
  }, []);
  
  // Enhanced category change handling
  const setSelectedCategory = useCallback((category) => {
    if (!CATEGORIES.includes(category)) {
      logDebug('AppStateContext', 'INVALID_CATEGORY', { attempted: category });
      return;
    }
    
    if (category !== selectedCategory) {
      logDebug('AppStateContext', 'CATEGORY_CHANGE', { 
        from: selectedCategory, 
        to: category 
      });
      incrementCounter('categoryChanges');
      setSelectedCategoryState(category);
    }
  }, [selectedCategory]);
  
  // Increment a debug counter
  const incrementCounter = useCallback((counterName) => {
    debugCounters.current[counterName] = (debugCounters.current[counterName] || 0) + 1;
    return debugCounters.current[counterName];
  }, []);
  
  // Get a debug counter value
  const getCounter = useCallback((counterName) => {
    return debugCounters.current[counterName] || 0;
  }, []);
  
  // Clear cached data for testing purposes
  const clearCache = useCallback((cacheType = 'all') => {
    if (cacheType === 'all' || cacheType === 'data') {
      dataCacheRef.current = {};
    }
    if (cacheType === 'all' || cacheType === 'images') {
      loadedImagesRef.current = new Set();
    }
    logDebug('AppStateContext', 'CACHE_CLEARED', { cacheType });
  }, []);
  
  // Values to provide through context
  const value = {
    // Category state
    selectedCategory,
    setSelectedCategory,
    CATEGORIES,
    
    // Cache references
    dataCacheRef,
    loadedImagesRef,
    clearCache,
    
    // Navigation state
    navigationStateRef,
    
    // Debug utilities
    logDebug,
    incrementCounter,
    getCounter,
  };
  
  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

// Custom hook to use the app state
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
