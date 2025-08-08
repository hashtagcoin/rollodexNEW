import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import ProviderDiscoveryScreen from './ProviderDiscoveryScreen.old';
import { useAppState } from '../../context/AppStateContext';
import { useFocusEffect } from '@react-navigation/native';

// Performance tracking for container
const containerPerformance = {
  instances: {},
  currentInstance: null
};

// Enable detailed debugging for this component
const DEBUG_CONTAINER = true;
const logContainer = (action, details = {}) => {
  if (DEBUG_CONTAINER) {
    const timestamp = Date.now();
    const elapsed = containerPerformance.currentInstance?.mountTime 
      ? timestamp - containerPerformance.currentInstance.mountTime 
      : 0;
    console.log(`[CONTAINER-TIMING][${containerPerformance.currentInstance?.id || 'unknown'}][${elapsed}ms] ${action}`, {
      timestamp,
      elapsed,
      ...details
    });
  }
};

/**
 * Container component for ProviderDiscoveryScreen
 * This prevents the screen from remounting when categories change
 */
const ProviderDiscoveryContainer = ({ route, navigation }) => {
  // Track mount/unmount cycles
  const mountCount = useRef(0);
  const instanceId = useRef(`container-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`).current;
  
  // Initialize performance tracking for this instance
  useEffect(() => {
    containerPerformance.currentInstance = {
      id: instanceId,
      mountTime: Date.now(),
      renders: 0,
      categoryChanges: [],
      stableComponentCreated: null
    };
    containerPerformance.instances[instanceId] = containerPerformance.currentInstance;
    
    logContainer('CONTAINER_MOUNTED', {
      instanceId,
      route: route?.params,
      totalInstances: Object.keys(containerPerformance.instances).length
    });
    
    return () => {
      logContainer('CONTAINER_UNMOUNTING', {
        instanceId,
        lifetime: Date.now() - containerPerformance.currentInstance.mountTime,
        renders: containerPerformance.currentInstance.renders,
        categoryChanges: containerPerformance.currentInstance.categoryChanges.length,
        stableComponentCreated: !!containerPerformance.currentInstance.stableComponentCreated
      });
      delete containerPerformance.instances[instanceId];
    };
  }, []);
  
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
  
  // Track renders
  containerPerformance.currentInstance.renders++;
  
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
    renderNumber: containerPerformance.currentInstance.renders,
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
      const changeTime = Date.now();
      logDebug('ProviderDiscoveryContainer', 'ROUTE PARAMS CHANGED', { 
        newCategory: route.params.initialCategory,
        currentCategory: selectedCategory
      });
      logContainer('ROUTE_PARAMS_CATEGORY_CHANGE', {
        from: selectedCategory,
        to: route.params.initialCategory,
        timestamp: changeTime
      });
      
      containerPerformance.currentInstance.categoryChanges.push({
        from: selectedCategory,
        to: route.params.initialCategory,
        timestamp: changeTime,
        source: 'route_params'
      });
      
      setSelectedCategory(route.params.initialCategory);
    }
  }, [route?.params?.initialCategory]);
  
  // Create a memoized version of the component to prevent recreating on every render
  const getStableComponent = useCallback(() => {
    if (screenComponentRef.current === null) {
      const creationTime = Date.now();
      logDebug('ProviderDiscoveryContainer', 'CREATING STABLE COMPONENT', { initialCategory: selectedCategory });
      logContainer('CREATING_STABLE_COMPONENT', { 
        initialCategory: selectedCategory,
        timestamp: creationTime 
      });
      
      containerPerformance.currentInstance.stableComponentCreated = {
        timestamp: creationTime,
        initialCategory: selectedCategory
      };
      
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
    } else {
      logContainer('REUSING_STABLE_COMPONENT', {
        createdAt: containerPerformance.currentInstance.stableComponentCreated?.timestamp,
        ageMs: containerPerformance.currentInstance.stableComponentCreated 
          ? Date.now() - containerPerformance.currentInstance.stableComponentCreated.timestamp 
          : 0
      });
    }
    return screenComponentRef.current;
  }, []);
  
  // Update the component when category changes
  useEffect(() => {
    const updateStart = Date.now();
    
    if (providerScreenRef.current) {
      logDebug('ProviderDiscoveryContainer', 'UPDATING COMPONENT VIA IMPERATIVE HANDLE', { 
        newCategory: selectedCategory,
        hasRef: !!providerScreenRef.current
      });
      
      logContainer('IMPERATIVE_UPDATE_START', {
        category: selectedCategory,
        hasRef: !!providerScreenRef.current,
        refType: typeof providerScreenRef.current?.updateCategory
      });
      
      // Check if the ref has the updateCategory method
      if (providerScreenRef.current && providerScreenRef.current.updateCategory) {
        providerScreenRef.current.updateCategory(selectedCategory);
        
        logContainer('IMPERATIVE_UPDATE_COMPLETE', {
          category: selectedCategory,
          updateTimeMs: Date.now() - updateStart
        });
      } else {
        logContainer('IMPERATIVE_UPDATE_FAILED', {
          category: selectedCategory,
          reason: 'No updateCategory method',
          refKeys: providerScreenRef.current ? Object.keys(providerScreenRef.current) : []
        });
      }
    } else {
      logContainer('NO_REF_FOR_UPDATE', { category: selectedCategory });
    }
  }, [selectedCategory]);
  
  // Track mount/unmount
  useEffect(() => {
    mountCount.current++;
    const mountTime = Date.now();
    logDebug('ProviderDiscoveryContainer', 'MOUNT', { 
      mountCount: mountCount.current,
      instanceId,
      timestamp: mountTime
    });
    logContainer('EFFECT_MOUNT', { 
      mountCount: mountCount.current,
      instanceId,
      timestamp: mountTime
    });
    
    return () => {
      logDebug('ProviderDiscoveryContainer', 'UNMOUNT', { 
        mountCount: mountCount.current,
        instanceId,
        lifetime: Date.now() - mountTime
      });
      logContainer('EFFECT_UNMOUNT', { 
        mountCount: mountCount.current,
        instanceId,
        lifetime: Date.now() - mountTime
      });
    };
  }, []);
  
  // Track focus changes
  useFocusEffect(
    useCallback(() => {
      const focusTime = Date.now();
      isFocused.current = true;
      logDebug('ProviderDiscoveryContainer', 'FOCUSED', { instanceId });
      logContainer('SCREEN_FOCUSED', { 
        instanceId,
        timestamp: focusTime,
        selectedCategory 
      });
      
      return () => {
        isFocused.current = false;
        logDebug('ProviderDiscoveryContainer', 'BLURRED', { instanceId });
        logContainer('SCREEN_BLURRED', { 
          instanceId,
          focusedDuration: Date.now() - focusTime,
          selectedCategory
        });
      };
    }, [instanceId])
  );
  
  // Always render the stable component
  const stableComponent = getStableComponent();
  
  logContainer('RENDERING_STABLE_COMPONENT', {
    hasComponent: !!stableComponent,
    componentKey: stableComponent?.key
  });
  
  return (
    <View style={{ flex: 1 }}>
      {stableComponent}
    </View>
  );
};

export default ProviderDiscoveryContainer;
