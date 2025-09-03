/**
 * Market Service - Handles all market data API calls
 */

import type { MarketData, MarketSummary, MarketTimeseries } from '../types/market'

export class MarketService {
  private static readonly BASE_URL = '/api/market-data'

  /**
   * Check if market simulation is initialized
   */
  static async checkSimulationStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/simulation/status`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const status = await response.json()
      return Boolean(status?.data_initialized)
    } catch (error) {
      console.error('Failed to check simulation status:', error)
      throw error
    }
  }

  /**
   * Initialize market simulation
   */
  static async initializeSimulation(): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/initialize`, { method: 'POST' })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to initialize simulation:', error)
      throw error
    }
  }

  /**
   * Fetch market summary data
   */
  static async fetchMarketSummary(): Promise<MarketSummary> {
    try {
      const response = await fetch(`${this.BASE_URL}/summary`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      const dayAheadPrice = Number(data?.day_ahead?.price) || 0
      const realTimePrice = Number(data?.real_time?.price) || 0
      const spread = realTimePrice - dayAheadPrice

      return {
        dayAheadPrice,
        realTimePrice,
        spread,
        isInitialized: true,
        referenceDate: data?.reference_date
      }
    } catch (error) {
      console.error('Failed to fetch market summary:', error)
      throw error
    }
  }

  /**
   * Fetch market timeseries data
   */
  static async fetchMarketTimeseries(): Promise<MarketTimeseries> {
    try {
      const response = await fetch(`${this.BASE_URL}/timeseries`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      return {
        dayAhead: Array.isArray(data?.day_ahead) ? data.day_ahead : [],
        realTime: Array.isArray(data?.real_time) ? data.real_time : [],
        referenceDate: data?.reference_date || '',
        simulationMode: Boolean(data?.simulation_mode),
        currentSimulationTime: data?.current_simulation_time || ''
      }
    } catch (error) {
      console.error('Failed to fetch market timeseries:', error)
      throw error
    }
  }

  /**
   * Convert raw market data to MarketData objects
   */
  static convertToMarketData(rawData: {
    day_ahead?: { price: number; timestamp: string }
    real_time?: { price: number; timestamp: string }
  }): MarketData[] {
    const items: MarketData[] = []
    
    if (rawData?.day_ahead?.price) {
      items.push({
        id: 'day_ahead',
        price: Number(rawData.day_ahead.price) || 0,
        timestamp: rawData.day_ahead.timestamp ? 
          new Date(rawData.day_ahead.timestamp).toISOString() : 
          new Date().toISOString(),
        market: 'DAY_AHEAD',
        source: 'gridstatus'
      })
    }
    
    if (rawData?.real_time?.price) {
      items.push({
        id: 'real_time',
        price: Number(rawData.real_time.price) || 0,
        timestamp: rawData.real_time.timestamp ? 
          new Date(rawData.real_time.timestamp).toISOString() : 
          new Date().toISOString(),
        market: 'REAL_TIME',
        source: 'gridstatus'
      })
    }
    
    return items
  }
}
