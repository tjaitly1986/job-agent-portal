/**
 * Simple rate limiter for scraping platforms
 * Ensures we don't exceed rate limits per platform
 */

interface RateLimitConfig {
  requestsPerSecond: number
}

class RateLimiter {
  private lastRequestTime: Map<string, number> = new Map()
  private config: Map<string, RateLimitConfig> = new Map()

  constructor() {
    // Platform-specific rate limits (from CLAUDE.md)
    this.config.set('indeed', { requestsPerSecond: 2 })
    this.config.set('dice', { requestsPerSecond: 3 })
    this.config.set('linkedin', { requestsPerSecond: 0.5 }) // 1 req per 2 seconds
    this.config.set('glassdoor', { requestsPerSecond: 2 })
    this.config.set('ziprecruiter', { requestsPerSecond: 2 })
    this.config.set('simplyhired', { requestsPerSecond: 2 })
    this.config.set('builtin', { requestsPerSecond: 3 })
    this.config.set('weworkremotely', { requestsPerSecond: 3 })
  }

  /**
   * Wait if necessary to respect rate limits for a platform
   */
  async throttle(platform: string): Promise<void> {
    const config = this.config.get(platform.toLowerCase())
    if (!config) {
      // No rate limit configured, proceed immediately
      return
    }

    const minInterval = 1000 / config.requestsPerSecond // milliseconds
    const lastTime = this.lastRequestTime.get(platform) || 0
    const now = Date.now()
    const timeSinceLastRequest = now - lastTime

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest
      await this.sleep(waitTime)
    }

    this.lastRequestTime.set(platform, Date.now())
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Set custom rate limit for a platform
   */
  setRateLimit(platform: string, requestsPerSecond: number): void {
    this.config.set(platform.toLowerCase(), { requestsPerSecond })
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()
