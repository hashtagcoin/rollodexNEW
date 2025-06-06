import React, { createContext, useContext, useRef, useState, useEffect, useCallback, useMemo } from 'react';

// Create a context to provide React hooks globally
export const GlobalHooksContext = createContext({});

// Export hooks to be used globally
export const useGlobalRef = useRef;
export const useGlobalState = useState;
export const useGlobalEffect = useEffect;
export const useGlobalCallback = useCallback;
export const useGlobalMemo = useMemo;

// Global hooks provider wrapper component
export const GlobalHooksProvider = ({ children }) => {
  // Log when this provider is mounted
  console.log(`[DEBUG][${new Date().toISOString()}] GlobalHooksProvider - Mounted`);
  
  // Provide all hooks via context
  const hooksValue = {
    useRef,
    useState,
    useEffect,
    useCallback,
    useMemo
  };
  
  return (
    <GlobalHooksContext.Provider value={hooksValue}>
      {children}
    </GlobalHooksContext.Provider>
  );
};

// Custom hook to access hooks from context if direct import isn't working
export const useGlobalHooks = () => {
  return useContext(GlobalHooksContext);
};

// Pre-export all hooks via global context
global.ReactHooks = {
  useRef,
  useState, 
  useEffect,
  useCallback,
  useMemo
};

export default GlobalHooksProvider;
