/**
 * Debug utilities for monitoring image caching performance
 */

class ImageDebugger {
  constructor() {
    this.loadTimes = new Map();
    this.cacheHits = new Map();
    this.cacheMisses = new Map();
    this.enabled = __DEV__;
  }

  /**
   * Record image load start time
   */
  recordLoadStart(url) {
    if (!this.enabled) return;
    this.loadTimes.set(url, Date.now());
  }

  /**
   * Record image load completion
   */
  recordLoadEnd(url, fromCache = false) {
    if (!this.enabled) return;
    
    const startTime = this.loadTimes.get(url);
    if (!startTime) return;
    
    const loadTime = Date.now() - startTime;
    this.loadTimes.delete(url);
    
    // Track cache performance
    if (fromCache) {
      const hits = this.cacheHits.get(url) || 0;
      this.cacheHits.set(url, hits + 1);
    } else {
      const misses = this.cacheMisses.get(url) || 0;
      this.cacheMisses.set(url, misses + 1);
    }
    
    // Log slow loads
    if (loadTime > 500) {
      console.warn(`[ImageDebug] Slow image load: ${url.substring(0, 50)}... took ${loadTime}ms (cache: ${fromCache})`);
    }
    
    return loadTime;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    if (!this.enabled) return null;
    
    const totalUrls = new Set([...this.cacheHits.keys(), ...this.cacheMisses.keys()]).size;
    const totalHits = Array.from(this.cacheHits.values()).reduce((a, b) => a + b, 0);
    const totalMisses = Array.from(this.cacheMisses.values()).reduce((a, b) => a + b, 0);
    const hitRate = totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses) * 100).toFixed(2) : 0;
    
    return {
      totalUrls,
      totalHits,
      totalMisses,
      hitRate: `${hitRate}%`,
      pendingLoads: this.loadTimes.size
    };
  }

  /**
   * Log cache performance report
   */
  logPerformanceReport() {
    if (!this.enabled) return;
    
    const stats = this.getCacheStats();
    console.log('[ImageDebug] Cache Performance Report:', stats);
    
    // Log URLs with most cache misses
    const missedUrls = Array.from(this.cacheMisses.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    if (missedUrls.length > 0) {
      console.log('[ImageDebug] Top cache misses:');
      missedUrls.forEach(([url, count]) => {
        console.log(`  - ${url.substring(0, 50)}... (${count} misses)`);
      });
    }
  }

  /**
   * Clear debug data
   */
  clear() {
    this.loadTimes.clear();
    this.cacheHits.clear();
    this.cacheMisses.clear();
  }
}

// Export singleton instance
export default new ImageDebugger();