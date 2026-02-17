/**
 * Bright Data MCP Client Wrapper
 *
 * Provides HTTP fetching through Bright Data's proxy infrastructure
 * for scraping job boards that block direct requests.
 */

import { HttpsProxyAgent } from 'https-proxy-agent'

export class BrightDataClient {
  private apiKey: string
  private zone: string
  private customerId: string

  constructor() {
    this.apiKey = process.env.BRIGHT_DATA_API_KEY || ''
    this.zone = process.env.BRIGHT_DATA_ZONE || 'scraping_browser'
    this.customerId = process.env.BRIGHT_DATA_CUSTOMER_ID || ''

    if (!this.apiKey || !this.customerId) {
      console.warn('Bright Data credentials not configured. Scraping will be limited.')
    }
  }

  /**
   * Check if Bright Data is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.customerId)
  }

  /**
   * Fetch a URL through Bright Data's proxy
   */
  async fetchViaProxy(
    url: string,
    options?: { residential?: boolean; headers?: Record<string, string> }
  ): Promise<Response> {
    if (!this.isConfigured()) {
      throw new Error('Bright Data not configured')
    }

    const zoneSuffix = options?.residential ? '-country-us' : ''
    const proxyUrl = `http://brd-customer-${this.customerId}-zone-${this.zone}${zoneSuffix}:${this.apiKey}@brd.superproxy.io:33335`
    const agent = new HttpsProxyAgent(proxyUrl)

    return fetch(url, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      agent: agent as any,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...options?.headers,
      },
    } as RequestInit)
  }

  /**
   * Fetch HTML content of a page via proxy
   */
  async fetchHtml(url: string, options?: { residential?: boolean }): Promise<string> {
    const response = await this.fetchViaProxy(url, options)
    if (!response.ok) {
      throw new Error(`Bright Data proxy fetch failed: HTTP ${response.status} for ${url}`)
    }
    return response.text()
  }

  /**
   * Get proxy configuration object (for external libraries)
   */
  getProxyConfig(residential: boolean = false): object {
    const zoneSuffix = residential ? '-country-us' : ''
    return {
      server: `brd.superproxy.io:33335`,
      username: `brd-customer-${this.customerId}-zone-${this.zone}${zoneSuffix}`,
      password: this.apiKey,
    }
  }
}

// Singleton instance
export const brightDataClient = new BrightDataClient()
