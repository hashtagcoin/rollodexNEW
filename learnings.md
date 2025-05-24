# React Native Development Learnings

## Image Flickering in Swipe Cards
**Keywords:** `image-flickering`, `swipe-cards`, `component-unmounting`, `react-native-animation`

### Issue Description
Images in swipe cards were flickering during animations because components were being unmounted and remounted during the animation process. This caused images to reload multiple times, leading to visual glitches and poor user experience.

### Root Causes
1. **Component Lifecycle Issues**: React was destroying and recreating card components during animations
2. **Animation Triggering Re-renders**: Position changes during animation caused React to re-evaluate the render tree
3. **Missing Proper Memoization**: Even with React.memo, parent components were re-rendering children

### Solution Implemented
1. Created a persistent card deck architecture that maintains component instances during animations
2. Used proper Z-index management instead of conditional rendering
3. Implemented forwardRef and useImperativeHandle for clean API access
4. Added global image preloading and caching system

### Prevention Instructions
- **Never use conditional rendering for animated components**. Use opacity/display/transform properties instead.
- **Always use proper refs with forwardRef** when parent components need to control child components.
- **Implement a global preloading strategy** for images that will be needed soon.
- **Use position absolute with z-index** for stacking cards instead of adding/removing them from the DOM.
- **Maintain component instances** throughout animations; only change visual properties.

---

## Variable Shadowing in React Component Callbacks
**Keywords:** `variable-shadowing`, `refs`, `callback-functions`, `react-refs`

### Issue Description
Button press handlers were shadowing the `swipeDeckRef` variable, causing "Property doesn't exist" errors:

```javascript
// Problem code
onPress={() => {
  const swipeDeckRef = swipeDeckRef.current; // Variable shadowing!
  if (swipeDeckRef) {
    swipeDeckRef.forceSwipeLeft();
  }
}}
```

### Root Causes
1. Local variable declared with same name as the component-level ref
2. JavaScript scoping rules causing the local variable to shadow the ref

### Solution Implemented
Changed the handlers to directly access the ref's current property:

```javascript
// Fixed code
onPress={() => {
  if (swipeDeckRef && swipeDeckRef.current) {
    swipeDeckRef.current.forceSwipeLeft();
  }
}}
```

### Prevention Instructions
- **Never name local variables the same as component variables** - use different naming patterns.
- **Access React refs with explicit .current property** - never try to extract ref.current into a separate variable.
- **Always null check refs before use** with `if (ref && ref.current)`.
- **Use linting tools** that catch variable shadowing issues.

---

## Image Preloading Error Handling
**Keywords:** `image-preloading`, `error-handling`, `network-errors`, `image-caching`

### Issue Description
Image preloading was showing console errors when images failed to load, leading to error messages in the console and potential cascading failures.

### Root Causes
1. Network errors or invalid image URLs causing unhandled promise rejections
2. Missing validation for image URLs before attempting to load them
3. Not properly handling the case where images fail to load

### Solution Implemented
1. Added URL validation before preloading
2. Wrapped Image.prefetch in a Promise with proper error handling
3. Used setTimeout to prevent blocking the JS thread
4. Added image URLs to cache even if they fail (to prevent repeated failures)

### Prevention Instructions
- **Always validate URLs before attempting to load images**
- **Use non-blocking approaches** with setTimeout when preloading resources
- **Implement proper error boundaries** for all network operations
- **Add failed resources to cache** to prevent repeated loading attempts
- **Use try/catch with async operations** to prevent unhandled promise rejections
- **Never use console.error for expected failures** - use console.warn or console.log

---

## React Native Component Lifecycle Management
**Keywords:** `component-lifecycle`, `useEffect`, `cleanup`, `memory-leaks`

### Issue Description
Components were not properly cleaning up resources when unmounted, leading to potential memory leaks and race conditions with async operations.

### Root Causes
1. Missing cleanup functions in useEffect hooks
2. Async operations continuing after component unmount
3. No proper tracking of component mount state

### Solution Implemented
1. Added proper cleanup in useEffect hooks
2. Used isMounted flags to track component lifecycle
3. Implemented InteractionManager for deferring state updates

### Prevention Instructions
- **Always return a cleanup function from useEffect** when dealing with animations, timers, or subscriptions
- **Track component mount state** with an isMounted variable or ref
- **Cancel in-flight operations on unmount** to prevent race conditions
- **Use InteractionManager.runAfterInteractions** for post-animation state updates
- **Implement memory usage tracking** in development to catch memory leaks

---

## Image Loading Performance
**Keywords:** `image-performance`, `lazy-loading`, `caching`, `react-native-image`

### Issue Description
Images were loading redundantly and inefficiently, causing performance issues and unnecessary network requests.

### Root Causes
1. No global image cache system
2. Images loading multiple times during component remounts
3. Missing optimization for already loaded images

### Solution Implemented
1. Created a global image preloader and cache system
2. Implemented intelligent preloading for upcoming images
3. Added detailed logging for tracking image load events
4. Used a Set to track loaded images across the app

### Prevention Instructions
- **Implement a central image caching strategy** across the entire app
- **Preload images before they are needed** (especially for carousel/swipe interfaces)
- **Track loaded images globally** to prevent redundant loads
- **Use proper memoization** to prevent unnecessary re-renders
- **Implement image loading metrics** to identify performance bottlenecks

---

## Import and Module Organization
**Keywords:** `imports`, `module-exports`, `named-exports`, `default-exports`

### Issue Description
Inconsistent import patterns led to errors when accessing exported functions from modules.

### Root Causes
1. Mixing named and default exports
2. Using destructuring imports with non-destructured exports
3. Inconsistent module organization

### Solution Implemented
1. Standardized imports with * as namespace imports
2. Fixed references to imported functions
3. Made sure exported functions are properly accessible

### Prevention Instructions
- **Be consistent with export patterns** - either use named exports or default exports, not both
- **Use namespace imports** (`import * as module`) when unsure about export structure
- **Consider using barrel files** (index.js) for organizing related exports
- **Always verify imports are working** before using imported functions
