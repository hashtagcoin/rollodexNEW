import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import ProviderDiscoveryScreen from './ProviderDiscoveryScreen.old';
import { useAppState } from '../../context/AppStateContext';
import { useFocusEffect } from '@react-navigation/native';

// Enable detailed debugging for this component
const DEBUG_CONTAINER = true;
const logContainer = (action, details = {}) => {
  if (DEBUG_CONTAINER) {
    console.log(`[CONTAINER-DEBUG] ${action}`, details);
  }
};

/**
 * Container component for ProviderDiscoveryScreen
 * This prevents the screen from remounting when categories change
 */
const ProviderDiscoveryContainer = ({ route, navigation }) => {
  // Track mount/unmount cycles
  const mountCount = useRef(0);
  const instanceId = useRef(`container-${Date.now()}`).current;
  const { 
    selectedCategory,
    setSelectedCategory, 
    logDebug
  } = useAppState();
  
  // Create a stable reference to the component instance and a ref for the imperative handle
  const screenComponentRef = useRef(null);
  const providerScreenRef = useRef(null);
  
  // Track focus state
  const isFocused = useRef(false);
  
  // Log for debugging each render
  logDebug('ProviderDiscoveryContainer', 'RENDER', { 
    selectedCategory,
    routeParams: route?.params,
    mountCount: mountCount.current,
    instanceId,
    hasScreenRef: !!screenComponentRef.current,
    hasProviderRef: !!providerScreenRef.current,
    isFocused: isFocused.current
  });
  
  logContainer('RENDER', {
    selectedCategory,
    routeParams: route?.params,
    mountCount: mountCount.current,
    instanceId,
    hasScreenRef: !!screenComponentRef.current,
    hasProviderRef: !!providerScreenRef.current,
    isFocused: isFocused.current
  });
  
  // Handle route params changes
  useEffect(() => {
    if (route?.params?.initialCategory && route.params.initialCategory !== selectedCategory) {
      logDebug('ProviderDiscoveryContainer', 'ROUTE PARAMS CHANGED', { 
        newCategory: route.params.initialCategory,
        currentCategory: selectedCategory
      });
      setSelectedCategory(route.params.initialCategory);
    }
  }, [route?.params?.initialCategory]);
  
  // Create a memoized version of the component to prevent recreating on every render
  const getStableComponent = useCallback(() => {
    if (screenComponentRef.current === null) {
      logDebug('ProviderDiscoveryContainer', 'CREATING STABLE COMPONENT', { initialCategory: selectedCategory });
      logContainer('CREATING STABLE COMPONENT', { initialCategory: selectedCategory });
      
      // Create a timestamp to uniquely identify this instance
      const timestamp = Date.now();
      
      screenComponentRef.current = (
        <ProviderDiscoveryScreen
          key={`stable-provider-discovery-instance-${timestamp}`}
          ref={providerScreenRef}
          route={route}
          navigation={navigation}
          containerProps={{
            selectedCategory,
            setSelectedCategory,
            containerId: instanceId,
            containerMountCount: mountCount.current
          }}
        />
      );
    }
    return screenComponentRef.current;
  }, []);
  
  // Update the component when category changes
  useEffect(() => {
    if (providerScreenRef.current) {
      logDebug('ProviderDiscoveryContainer', 'UPDATING COMPONENT VIA IMPERATIVE HANDLE', { 
        newCategory: selectedCategory,
        hasRef: !!providerScreenRef.current
      });
      logContainer('UPDATING CATEGORY', { 
        newCategory: selectedCategory,
        hasRef: !!providerScreenRef.current,
        isFocused: isFocused.current
      });
      providerScreenRef.current.updateCategory(selectedCategory);
    } else {
      logDebug('ProviderDiscoveryContainer', 'NO REF AVAILABLE YET', { selectedCategory });
      logContainer('NO REF AVAILABLE', { selectedCategory });
    }
  }, [selectedCategory]);
  
  // Track component mount/unmount
  useEffect(() => {
    mountCount.current++;
    logContainer('COMPONENT MOUNTED', { mountCount: mountCount.current });
    
    return () => {
      logContainer('COMPONENT UNMOUNTING', { mountCount: mountCount.current });
      // Don't clear screenComponentRef here to prevent recreating on navigation
    };
  }, []);
  
  // Track screen focus/blur
  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      logContainer('SCREEN FOCUSED', { 
        mountCount: mountCount.current,
        selectedCategory,
        hasScreenRef: !!screenComponentRef.current,
        hasProviderRef: !!providerScreenRef.current
      });
      
      return () => {
        isFocused.current = false;
        logContainer('SCREEN BLURRED', { 
          mountCount: mountCount.current,
          selectedCategory
        });
      };
    }, [])
  );
  
  return (
    <View style={{ flex: 1 }}>
      {getStableComponent()}
      {/* Track render count */}
      {logContainer('RENDERED TO DOM', { mountCount: mountCount.current, timestamp: Date.now() }) && null}
    </View>
  );
};

export default ProviderDiscoveryContainer;
