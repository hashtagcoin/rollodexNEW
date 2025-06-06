import React from 'react';

// This file provides a solution for the useRef ReferenceError in React Navigation
// The issue happens because hooks context gets lost in some React Navigation components

// Apply the hook fix early in the import chain
const applyHooksFix = () => {
  try {
    // Make React hooks available globally for internal components
    // This helps components that don't have proper access to hooks through imports
    if (React && !global.useRef) {
      // Store core hooks in global scope where RNSScreenContainer can access them
      global.useRef = React.useRef;
      global.useState = React.useState;
      global.useEffect = React.useEffect;
      global.useContext = React.useContext;
      global.useReducer = React.useReducer;
      global.useCallback = React.useCallback;
      global.useMemo = React.useMemo;
      global.useLayoutEffect = React.useLayoutEffect;
      
      console.log('[HOOKS FIX] Successfully applied React hooks globals');
    } else {
      console.log('[HOOKS FIX] Skipped - hooks already available globally');
    }
  } catch (error) {
    console.error('[HOOKS FIX] Failed to apply hooks fix:', error);
  }
};

// Apply the fix immediately when this file is imported
applyHooksFix();

// Re-export for explicit usage
export const ensureHooks = applyHooksFix;
